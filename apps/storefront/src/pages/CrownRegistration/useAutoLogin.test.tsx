import { renderWithProviders, screen, waitFor } from 'tests/test-utils';

import * as bcModule from '@/shared/service/bc';
import b2bLogger from '@/utils/b3Logger';
import * as loginModule from '@/utils/b3Login';
import { B3SStorage } from '@/utils/b3Storage';
import * as loginInfoModule from '@/utils/loginInfo';

import * as loginHelperModule from '../Login/helper';

import { LoginCredentials, useAutoLogin } from './useAutoLogin';

const credentials: LoginCredentials = { email: 'ada@acmefoods.com', password: 'secret123' };

const customer = { email: credentials.email, phone: '3125550100', firstName: 'Ada' };

let result: boolean | undefined;

function Harness() {
  const login = useAutoLogin();

  return (
    <button
      type="button"
      onClick={async () => {
        result = await login(credentials);
      }}
    >
      login
    </button>
  );
}

const renderHarness = (initialGlobalContext: Record<string, unknown> = {}) =>
  renderWithProviders(<Harness />, { initialGlobalContext, initialEntries: ['/register'] });

const clickLogin = async (user: ReturnType<typeof renderHarness>['user']) => {
  await user.click(screen.getByRole('button', { name: 'login' }));
  await waitFor(() => expect(result).toBeDefined());
};

describe('useAutoLogin', () => {
  beforeEach(() => {
    result = undefined;
    vi.spyOn(bcModule, 'bcLogin').mockResolvedValue({ data: { login: { customer } } });
    vi.spyOn(loginInfoModule, 'getCurrentCustomerInfo').mockResolvedValue(undefined);
    vi.spyOn(loginModule, 'loginJump').mockReturnValue(true);
  });

  it('logs in, stores the customer and goes to the orders page', async () => {
    const { user, navigation } = renderHarness();

    await clickLogin(user);

    expect(bcModule.bcLogin).toHaveBeenCalledWith(credentials);
    expect(B3SStorage.get('loginCustomer')).toMatchObject({
      emailAddress: customer.email,
      phoneNumber: customer.phone,
    });
    expect(loginInfoModule.getCurrentCustomerInfo).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
    await waitFor(() => expect(navigation).toHaveBeenCalledWith('/orders'));
  });

  it('leaves navigation to loginJump when it handles the landing location', async () => {
    vi.spyOn(loginModule, 'loginJump').mockReturnValue(false);
    const { user, navigation } = renderHarness();

    await clickLogin(user);

    expect(result).toBe(true);
    expect(navigation).not.toHaveBeenCalledWith('/orders');
  });

  it('uses the checkout login and reloads when registering from checkout', async () => {
    const loginCheckout = vi.spyOn(loginHelperModule, 'loginCheckout').mockResolvedValue({});
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      reload,
    } as Location);
    const { user } = renderHarness({ isCheckout: true });

    await clickLogin(user);

    expect(loginCheckout).toHaveBeenCalledWith(credentials);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(bcModule.bcLogin).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('logs and resolves false when the login request throws', async () => {
    const error = new Error('network down');
    vi.spyOn(bcModule, 'bcLogin').mockRejectedValue(error);
    const logError = vi.spyOn(b2bLogger, 'error').mockImplementation(() => {});
    const { user, navigation } = renderHarness();

    await clickLogin(user);

    expect(result).toBe(false);
    expect(logError).toHaveBeenCalledWith(error);
    expect(navigation).not.toHaveBeenCalledWith('/orders');
  });

  it('resolves false when the login returns no customer', async () => {
    vi.spyOn(bcModule, 'bcLogin').mockResolvedValue({ data: { login: { customer: null } } });
    const logError = vi.spyOn(b2bLogger, 'error').mockImplementation(() => {});
    const { user } = renderHarness();

    await clickLogin(user);

    expect(result).toBe(false);
    expect(logError).toHaveBeenCalledTimes(1);
    expect(loginInfoModule.getCurrentCustomerInfo).not.toHaveBeenCalled();
  });
});
