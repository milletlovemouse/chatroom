import  React from 'react';
import { Layout, theme } from 'antd';
import ChatRoom from '/@/pages/chatroom';

const { Content } = Layout;

const App: React.FC = () => {
  const {
    token: { colorPrimary },
  } = theme.useToken();
  
  return (
    <Layout>
      <Content
        style={{
          padding: 5,
          minHeight: '100vh',
          background: colorPrimary,
        }}
      >
        <ChatRoom />
      </Content>
    </Layout>
  );
};

export default App;