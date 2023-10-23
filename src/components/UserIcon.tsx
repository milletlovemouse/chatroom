import { UserOutlined } from '@ant-design/icons';
import React, { memo } from 'react';
import styles from './UserIcon.module.less';

const UserIcon: React.FC<{
  style?: React.CSSProperties;
}> = memo((props) => {
  return (
    <div style={props.style} className={styles.userIcon + ' ' + 'user-icon'}>
      <UserOutlined />
    </div>
  );
})

export default UserIcon;