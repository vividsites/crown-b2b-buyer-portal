import { Box, Button } from '@mui/material';

import { useMobile } from '@/hooks/useMobile';

import LoginWidget from './component/LoginWidget';

interface LoginPanelProps {
  widgetBodyText: string;
  createAccountButtonText: string;
  handleCreateAccountClick: () => void;
}

function LoginPanel(props: LoginPanelProps) {
  const { widgetBodyText, createAccountButtonText, handleCreateAccountClick } = props;

  const [isMobile] = useMobile();

  return (
    <Box
      sx={{
        borderRadius: '4px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: '#15296e'
      }}
    >
      <LoginWidget
        sx={{
          '& .panel': {
            '.panel-title': {
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              fontWeight: 400,
              fontSize: '24px',
              margin: '0',
            },
          },
        }}
        html={widgetBodyText}
      />
      <Box
        sx={{
          padding: '12px 20px 20px 20px',
          marginTop: '0px',
          textAlign: 'center'
        }}
      >
        <Button
          type="button"
          onClick={handleCreateAccountClick}
          variant="contained"
          sx={{
            ml: isMobile ? 0 : 1,
            backgroundColor: '#FFF',
            color: '#ea1c2d',
            '&:hover': {
              backgroundColor: '#FFF',
              color: '#cd1323',
            },
          }}
        >
          {createAccountButtonText}
        </Button>
      </Box>
    </Box>
  );
}

export default LoginPanel;
