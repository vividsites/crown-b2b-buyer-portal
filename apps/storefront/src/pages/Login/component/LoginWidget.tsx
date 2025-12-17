import { Box, BoxProps, SxProps } from '@mui/material';
import { styled } from '@mui/material/styles';

interface LoginWidgetProps {
  sx: SxProps;
  html: string;
}

const LoginWidgetBox = styled(Box)<BoxProps>(() => ({
  '& .button--primary': {
    'display': 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    'position': 'relative',
    'box-sizing': 'border-box',
    '-webkit-tap-highlight-color': 'transparent',
    'cursor': 'pointer',
    'user-select': 'none',
    'vertical-align': 'middle',
    'appearance': 'none',
    'font-family': 'Roboto, Helvetica, Arial, sans-serif',
    'font-weight': '500',
    'font-size': '0.875rem',
    'line-height': '1.75',
    'letter-spacing': '0.02857em',
    'text-transform': 'uppercase',
    'min-width': '64px',
    'color': 'rgb(255, 255, 255)',
    'box-shadow': 'rgba(0, 0, 0, 0.2) 0px 3px 1px -2px, rgba(0, 0, 0, 0.14) 0px 2px 2px 0px, rgba(0, 0, 0, 0.12) 0px 1px 5px 0px',
    'background-color': 'rgb(25, 118, 210)',
    'outline': '0px',
    'border-width': '0px',
    'margin': '0px 0px 0px 8px',
    'text-decoration': 'none',
    'padding': '6px 16px',
    'border-radius': '4px',
    'transition': 'background-color 250ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1), border-color 250ms cubic-bezier(0.4, 0, 0.2, 1), color 250ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  '& .button--primary:hover': {
    '-webkit-text-decoration': 'none',
    'text-decoration': 'none',
    'background-color': 'rgb(17, 82, 147)',
    'box-shadow': '0px 2px 4px -1px rgba(0, 0, 0, 0.2), 0px 4px 5px 0px rgba(0, 0, 0, 0.14), 0px 1px 10px 0px rgba(0, 0, 0, 0.12)',
  },
  '& .panel + .panel': {
    'margin-top': '40px',
  },
}));

function LoginWidget(props: LoginWidgetProps) {
  const { html, sx } = props;

  return (
    <LoginWidgetBox
      sx={{
        ...sx,
      }}
      dangerouslySetInnerHTML={{
        __html: html,
      }}
    />
  );
}

export default LoginWidget;
