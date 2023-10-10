import * as React from 'react'
import ConfigProvider from 'antd/es/config-provider'
import Layout from '/@/components/Layout/Layout'
import { App as AntdApp } from 'antd';
import { createContext } from 'react';
import { message } from 'antd';

type ThemeData = {
  borderRadius: number;
  colorPrimary: string;
  colorBgContainer: string;
  Button?: {
    colorPrimary: string;
    algorithm?: boolean;
  };
};

export const AppContext = createContext<{

}>(null);

const defaultData: ThemeData = {
  borderRadius: 4,
  colorPrimary: '#2b2b2b',
  colorBgContainer: '#2b2b2b',
  Button: {
    colorPrimary: '#444444',
  },
};

const App: React.FC = () => {  
  const [data] = React.useState<ThemeData>(defaultData);
  return (
    <AppContext.Provider value={{}}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: data.colorPrimary,
            borderRadius: data.borderRadius,
            // colorBgContainer: data.colorBgContainer,
          },
          components: {
            Button: {
              colorPrimary: data.Button?.colorPrimary,
              algorithm: data.Button?.algorithm,
            },
          },
        }}
      >
        <AntdApp>
          <Layout />
        </AntdApp>
      </ConfigProvider>
    </AppContext.Provider>
    
  )
}

export default App