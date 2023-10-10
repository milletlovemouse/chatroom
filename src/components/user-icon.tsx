import { theme } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import React, { memo } from 'react';


const UserIcon: React.FC<{
  style?: React.CSSProperties;
}> = memo((props, {style}) => {
  const { token } = theme.useToken();
  return (
    <div style={{
      // border: `2px solid #444`,
      borderRadius: token.borderRadius,
      background: '#2b2b2b',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: '100%',
      fontSize: '35em',
      color: '#111',
      ...(style || {})
    }}>
      <UserOutlined />
    </div>
  );
})

export default UserIcon;