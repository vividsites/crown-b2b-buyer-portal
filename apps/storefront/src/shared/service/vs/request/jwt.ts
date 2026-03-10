import {
  store,
} from '@/store';
import {
  setVSCurrentCustomerJWT,
} from '@/store/slices/company';
import b2bLogger from '../../../../utils/b3Logger';

import { getVSAppClientId } from '@/shared/service/vs/request/base';
import { getVSCurrentCustomerJWT } from '@/shared/service/vs/api/login';

export const ensureVSCurrentCustomerJWT = async () => {
  const prevVSCurrentCustomerJWT = store.getState().company.tokens.vsCurrentCustomerJWT;
  let vsCurrentCustomerJWT;
  try {
    vsCurrentCustomerJWT = await getVSCurrentCustomerJWT(getVSAppClientId());
  } catch (error) {
    b2bLogger.error(error);
    return undefined;
  }
  if (vsCurrentCustomerJWT && prevVSCurrentCustomerJWT !== vsCurrentCustomerJWT){
    store.dispatch(setVSCurrentCustomerJWT(vsCurrentCustomerJWT));
  }
}