import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import RTCClient, { ConnectorInfoList, StreamType } from '/@/utils/WebRTC/rtc-client';
import { onError } from '/@/utils/WebRTC/message';
import Join from '/@/components/chatroom/Join';
import DeviceSelect, { RefType } from '/@/components/chatroom/DeviceSelect';
import MemberList from '/@/components/chatroom/MemberList';
import style from './index.module.less';
import Chat, { RefType as ChatRef } from '/@/components/chat/Chat';

let rtc: RTCClient
export const Context = createContext(null);
const ChatRoom: React.FC = () => {
  const [isInRoom, setIsInRoom] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream>(null)
  const [displayStream, setDisplayStream] = useState<{
    streamType: 'display' | 'remoteDisplay',
    connectorId: 'display',
    remoteStream: MediaStream,
  }>(null)
  const [deviceInfo, setDeviceInfo] = useState({
    audioDisabled: false,
    cameraDisabled: false,
    audioDeviceId: '',
    cameraDeviceId: '',
    dispalyEnabled: false
  })

  const [joinDisable, setJoinDisable] = useState(true)
  const [connectorInfoList, setConnectorInfoList] = useState<ConnectorInfoList>([])

  const memberList = useMemo<{
    streamType: StreamType,
    connectorId: string,
    remoteStream?: MediaStream,
  }[]>(() => {
    const mainConnectorInfo = connectorInfoList.find(connectorInfo => connectorInfo.streamType !== 'user')    
    if (mainConnectorInfo) {
      setDisplayStream({
        streamType: 'remoteDisplay',
        connectorId: 'display',
        remoteStream: mainConnectorInfo.remoteStream,
      })
    } else if (displayStream && displayStream?.streamType !== 'display') {
      setDisplayStream(null)
    }
    return[{
      streamType: 'user',
      connectorId: 'local',
      remoteStream: localStream,
    }, ...connectorInfoList.filter(connectorInfo => connectorInfo.streamType === 'user')]
  },[connectorInfoList, localStream])

  const host = process.env.SOCKET_HOST
  const port = process.env.SOCKET_PORT as unknown as number

  if (!rtc) {
    rtc = new RTCClient({
      configuration: {
        iceServers: [
          {
            urls: `turn:stun.l.google.com:19302`,
            username: "webrtc",
            credential: "turnserver",
          },
        ],
      },
      constraints: {
        audio: deviceInfo.audioDisabled ? false : {
          deviceId: deviceInfo.audioDeviceId
        },
        video: deviceInfo.cameraDisabled ? false : {
          deviceId: deviceInfo.cameraDeviceId
        }
      },
      socketConfig: {
        host,
        port,
      }
    })
  } else {
    rtc.off('connectorInfoListChange')
    rtc.off('displayStreamChange')
    rtc.off('localStreamChange')
  }

  rtc.on('connectorInfoListChange', (data) => {
    setConnectorInfoList(data)
  })
  
  rtc.on('displayStreamChange', async (stream) => {
    setDisplayStream(stream ? {
      streamType: 'display',
      connectorId: 'display',
      remoteStream: stream,
    } : null)
  
    setDeviceInfo({
      ...deviceInfo,
      dispalyEnabled: !!stream
    })
  })
  
  rtc.on('localStreamChange', async (stream) => {
    setLocalStream(stream)
  })

  const join = useCallback((userInfo: { username: string, roomname: string }) => {
    fetch(`${host}:${port}/checkUsername?${new URLSearchParams(userInfo).toString()}`, { method: 'GET' })
      .then(response => response.json())
      .then(async data => {
        if (!data.isRepeat) {
          setIsInRoom(true)
          rtc.join(userInfo)
          return
        }
        onError('房间内用户名已存在')
      })
      .catch((err) => {
        console.error(err);
        onError('检查用户名失败')
      })
  }, [host, port, rtc])

  // 麦克风设备切换禁用状态
  const audioDisabledToggle = (value: boolean) => {
    if (value) {
      rtc.disableAudio()
    } else {
      rtc.enableAudio()
    }
  }
  // 摄像头设备切换禁用状态
  const cameraDisabledToggle = (value: boolean) => {
    if (value) {
      rtc.disableVideo()
    } else {
      rtc.enableVideo()
    }
  }

  // 麦克风设备切换处理事件
  const audioChange = (deviceId: string) => {
    rtc.replaceAudioTrack(deviceId)
  }

  // 摄像头设备切换处理事件
  const cameraChange = (deviceId: string) => {
    rtc.replaceVideoTrack(deviceId)
  }

  // 切换屏幕共享
  const shareDisplayMedia = async (value: boolean) => {
    if (!value) {
      rtc.cancelShareDisplayMedia()
      return
    }
    rtc.shareDisplayMedia().catch(() => {
      setDeviceInfo({
        ...deviceInfo,
        dispalyEnabled: false
      })
    })
  }

  const [open, setOpen] = useState(false)
  const chat = useRef<ChatRef>(null)
  const deviceSelect = useRef<RefType>(null)
  const chatBoxToggle = (value: boolean) => {
    setOpen(value)
  }

  // 退出房间
  const exit = () => {
    rtc.leave()
    setIsInRoom(false)
    setOpen(false)
    chat.current.clearMessage()
    deviceSelect.current.reset()
  }

  const close = (event: Event) => {
    event.preventDefault();
    exit()
    rtc.close()
  }

  useEffect(() => {
    rtc.getLocalStream().then(async (stream) => {
      setLocalStream(stream)
    })
    window.addEventListener('unload', close);
    return function cleanup() {
      rtc.close()
      window.removeEventListener('unload', close);
    }
  }, [])
  return (
    <Context.Provider value={rtc}>
      <div className={style.chatRoom}>
        <div className={'chat-room-body'  + ' ' + (open ? 'open' : '')}>
          {!isInRoom
            ? <Join stream={localStream} joinDisable={joinDisable} join={join}></Join>
            : <MemberList memberList={memberList} mainStream={displayStream}></MemberList>
          }
          <div className="chat-room-tool">
            <DeviceSelect
              ref={deviceSelect}
              deviceInfo={deviceInfo}
              joinDisable={joinDisable}
              state={isInRoom}
              open={open}
              updateDeviceInfo={value => setDeviceInfo(value)}
              updateJoinDisable={value => {setJoinDisable(value)}}
              onAudioChange={audioChange}
              onCameraChange={cameraChange}
              onAudioDisabledToggle={audioDisabledToggle}
              onCameraDisabledToggle={cameraDisabledToggle}
              onDispalyEnabledToggle={shareDisplayMedia}
              onChatBoxToggle={chatBoxToggle}
              onExit={exit}
            />
          </div>
        </div>
        <Chat ref={chat} open={open} />
      </div>
    </Context.Provider>
  )
}

export default ChatRoom;