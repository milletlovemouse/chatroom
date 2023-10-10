import React, { memo, useCallback, useState } from 'react';
import { Input } from 'antd';
import style from './Join.module.less';
import UserIcon from '@/components/user-icon';

type JoinProps = {
  stream: MediaStream;
  joinDisable: boolean;
  join: (value: {
    roomname: string;
    username: string
  }) => void
}

const Join: React.FC<JoinProps> = memo(({stream, joinDisable, join}) => {
  const [roomname, setRoomname] = useState('');
  const [username, setUsername] = useState('');
  const className = joinDisable ? 'submit disabled' : 'submit';
  
  const setVideo = useCallback((v: HTMLVideoElement) => {
    if (!v) return
    v.srcObject = stream;
    v.load();
    v.play();
  }, [stream])

  const submit = (e: Event) => {
    e.preventDefault()
    if (joinDisable) return
    join({
      roomname,
      username
    })
  }

  const setForm = (f: HTMLFormElement) => {
    if (!f) return
    f.onsubmit = submit
  }

  return (
    <div className={style.chatJoin}>
      <div className="video-box">
        {!!stream
          ? <video ref={setVideo}></video>
          : <UserIcon />
        }
      </div>
      <form ref={setForm} className="form">
        <div className="input-box">
          <Input value={roomname} onChange={(e) => setRoomname(e.target.value)} bordered={false} required />
          <span>Roomname</span>
          <i></i>
        </div>
        <div className="input-box">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} bordered={false} required />
          <span>Username</span>
          <i></i>
        </div>
        <input className={className} type="submit" value="加入房间" />
      </form>
    </div>
  )
})

export default Join;