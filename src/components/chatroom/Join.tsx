import React, { memo, useCallback, useState, useMemo } from 'react';
import { Input } from 'antd';
import style from './Join.module.less';
import UserIcon from '/@/components/UserIcon';

type JoinProps = {
  stream: MediaStream;
  join: (value: {
    roomname: string;
    username: string
  }) => void
}

const Join: React.FC<JoinProps> = memo((props) => {
  const [roomname, setRoomname] = useState('');
  const [username, setUsername] = useState('');
  
  const setVideo = useCallback((v: HTMLVideoElement) => {
    if (!v) return
    v.srcObject = props.stream;
    v.onloadedmetadata = () => {
      v.play();
    };
  }, [props.stream])

  const hasVideo = useMemo(() => {
    return !!(props.stream && props.stream.getVideoTracks().length)
  }, [props.stream])

  const submit = (e: Event) => {
    e.preventDefault()
    props.join({
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
        {!!hasVideo
          ? <video ref={setVideo} muted></video>
          : <UserIcon />
        }
      </div>
      <form ref={setForm} className="form">
        <div className="input-box">
          <Input value={roomname} onChange={(e) => setRoomname(e.target.value)} bordered={false} required />
          <span>房间名</span>
          <i></i>
        </div>
        <div className="input-box">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} bordered={false} required />
          <span>用户名</span>
          <i></i>
        </div>
        <input className="submit" type="submit" value="加入房间" />
      </form>
    </div>
  )
})

export default Join;