import { AudioFilled, AudioMutedOutlined, AudioOutlined } from "@ant-design/icons";
import { Button, Select, Space, Badge } from "antd";
import { Icon } from '@ricons/utils'
import { Video48Regular, VideoOff48Regular, Video48Filled } from '@ricons/fluent';
import { DeviceDesktop, DeviceDesktopOff } from '@ricons/tabler'
import { ExitToAppFilled } from '@ricons/material'
import { ChatboxEllipsesOutline } from '@ricons/ionicons5'
import React, { forwardRef, memo, Ref, useContext, useEffect, useImperativeHandle, useState, useRef } from "react";
import { DeviceInfo } from "/@/utils/MediaDevices/mediaDevices";
import RTCClient from '@/utils/WebRTC/rtc-client';
import { onError } from "/@/utils/WebRTC/message";
import { Context } from "/@/pages/chatroom";
import { useSelector, useDispatch } from 'react-redux'
import { clearCount } from '@/store/reducers/chat';
import { State } from "/@/store";

export interface Emits {
  updateDeviceInfo?: (deviceInfo: Props['deviceInfo']) => void;
  onAudioChange?: (deviceId: string) => void;
  onCameraChange?: (deviceId: string) => void;
  onAudioDisabledToggle?: (disable: boolean) => void;
  onCameraDisabledToggle?: (disable: boolean) => void;
  onDispalyEnabledToggle?: (enable: boolean) => void;
  onChatBoxToggle?: (value: boolean) => void;
  onExit?: () => void;
}
export interface Props extends Emits {
  deviceInfo: {
    audioDisabled: boolean;
    cameraDisabled: boolean;
    audioDeviceId: string;
    cameraDeviceId: string;
    dispalyEnabled: boolean;
  };
  state: boolean;
  open: boolean
}

export type RefType = {
  reset: () => void;
  updateDeviceId: (tracks: MediaStreamTrack[]) => void;
}

const DeviceSelect = memo(forwardRef((props: Props, ref: Ref<RefType>) => {
  const count = useSelector((state: State) => state.chat.count)
  const dispatch = useDispatch()
  const rtc = useContext<RTCClient>(Context)
  const fieldNames = { value: 'deviceId' }
  const iconStyle = {
    fontSize: '1.3em'
  }
  // 媒体流列表
  type Options = Array<DeviceInfo>
  let [audioMediaStreamTrackOptions, setAudioMediaStreamTrackOptions] = useState<Options>([])
  let [cameraMediaStreamTrackOptions, setCameraMediaStreamTrackOptions] = useState<Options>([])
  
  const updataModelValue = (data: Partial<Props['deviceInfo']>) => {
    props.updateDeviceInfo?.({ ...props.deviceInfo, ...data })
  }

  // 麦克风设备切换禁用状态
  const audioDisabledToggle = () => {
    const disabled = !props.deviceInfo.audioDisabled
    audioDisabledChange(disabled)
  }

  function audioDisabledChange(disabled: boolean) {
    updataModelValue({ audioDisabled: disabled })
    props.onAudioDisabledToggle?.(disabled)
  }

  // 摄像头设备切换禁用状态
  const cameraDisabledToggle = () => {
    const disabled = !props.deviceInfo.cameraDisabled
    cameraDisabledChange(disabled)
  }

  function cameraDisabledChange(disabled: boolean) {
    updataModelValue({ cameraDisabled: disabled })
    props.onCameraDisabledToggle?.(disabled)
  }

  // 麦克风设备切换处理事件
  const audioChange = (deviceId: string) => {
    updataModelValue({ audioDeviceId: deviceId })
    props.onAudioChange?.(deviceId)
  }

  // 摄像头设备切换处理事件
  const cameraChange = (deviceId: string) => {
    updataModelValue({ cameraDeviceId: deviceId })
    props.onCameraChange?.(deviceId)
  }

  // 开启/取消共享屏幕
  const dispalyEnabledToggle = () => {
    const enabled = !props.deviceInfo.dispalyEnabled
    updataModelValue({ dispalyEnabled: enabled })
    props.onDispalyEnabledToggle?.(enabled)
  }

  const chatBoxToggle = () => {
    if (!props.open) {
      dispatch(clearCount())
    }
    props.onChatBoxToggle?.(!props.open)
  }

  const exit = () => {
    props.onExit?.()
  }

  function reset() {
    props.onChatBoxToggle?.(false)
  }

  function updateDeviceId(tracks: MediaStreamTrack[]) {
    if (tracks.length === 0) {
      audioDisabledChange(false)
      cameraDisabledChange(false)
    } else if (tracks.length === 1) {
      if (tracks[0].kind === 'audio') {
        audioDisabledChange(false)
      } else if (tracks[0].kind === 'video') {
        cameraDisabledChange(false)
      }
    }
    for (const track of tracks) {
      if (track.kind === 'audio'){
        const deviceId = audioMediaStreamTrackOptions.find(input => input.label === track.label)?.deviceId
        updataModelValue({ audioDeviceId: deviceId })
      } else if (track.kind === 'video'){
        const deviceId = cameraMediaStreamTrackOptions.find(input => input.label === track.label)?.deviceId
        updataModelValue({ cameraDeviceId: deviceId })
      }
    }
  }

  let videoTips = useRef(true)
  async function initVideoDevice() {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true })
      const deviceInfoList = await rtc.getDevicesInfoList()
      setCameraMediaStreamTrackOptions(deviceInfoList.filter(info => info.kind === 'videoinput'))
    } catch (error) {
      if (videoTips.current) {
        onError('未能成功访问摄像头')
        console.error(error.message, error.name);
      }
      if (error.name !== 'NotFoundError') {
        setTimeout(initVideoDevice, 1000)
        videoTips.current = false
      }
    }
  }
  
  let audioTips = useRef(true)
  async function initAudioDevice() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      const deviceInfoList = await rtc.getDevicesInfoList()
      setAudioMediaStreamTrackOptions(deviceInfoList.filter(info => info.kind === 'audioinput'))
    } catch (error) {
      if (audioTips.current) {
        onError('未能成功访问麦克风')
        console.error(error.message, error.name);
      }
      if (error.name !== 'NotFoundError') {
        setTimeout(initAudioDevice, 1000)
        audioTips.current = false
      }
    }
  }

  async function initDeviceInfo() {
    initVideoDevice()
    initAudioDevice()
  }

  useImperativeHandle(ref, () => {
    return {
      reset,
      updateDeviceId
    }
  })

  useEffect(() => {
    initDeviceInfo()
  }, [])
  return (
    <div className="device-select" style={{textAlign: 'center'}}>
      <Space>
        <Select
          value={props.deviceInfo.audioDeviceId}
          style={{width: 120}}
          options={audioMediaStreamTrackOptions}
          onChange={audioChange}
          fieldNames={fieldNames}
          disabled={props.deviceInfo.audioDisabled}
          suffixIcon={<AudioFilled style={iconStyle} />}
        >
        </Select>
        <Button
          onClick={audioDisabledToggle}
          shape="circle"
          icon={props.deviceInfo.audioDisabled ? <AudioMutedOutlined />: <AudioOutlined />}
        />
        <Select
          value={props.deviceInfo.cameraDeviceId}
          style={{width: 120}}
          options={cameraMediaStreamTrackOptions}
          onChange={cameraChange}
          fieldNames={fieldNames}
          disabled={props.deviceInfo.cameraDisabled}
          suffixIcon={<span className="anticon" style={iconStyle}><Icon><Video48Filled /></Icon></span>}
        >
        </Select>
        <Button
          onClick={cameraDisabledToggle}
          shape="circle"
          icon={<span className="anticon" style={iconStyle}><Icon>{props.deviceInfo.cameraDisabled ? <VideoOff48Regular /> : <Video48Regular />}</Icon></span>}
        />
      </Space>
      {props.state ? (
        <span>
          &nbsp;
          &nbsp;
          <Button
            onClick={dispalyEnabledToggle}
            icon={<span className="anticon" style={iconStyle}><Icon>{props.deviceInfo.dispalyEnabled ? <DeviceDesktopOff /> : <DeviceDesktop />}</Icon></span>}
            type="primary"
          >
            {props.deviceInfo.dispalyEnabled ? '取消共享' : '共享屏幕'}
          </Button>
          &nbsp;
          &nbsp;
          <Badge count={count}>
            <Button
              shape="circle"
              type="primary"
              icon={<span className="anticon" style={iconStyle}><Icon><ChatboxEllipsesOutline /></Icon></span>}
              onClick={chatBoxToggle}
              >
            </Button>
          </Badge>
          
          &nbsp;
          &nbsp;
          <Button 
            onClick={exit}
            icon={<span className="anticon" style={iconStyle}><Icon><ExitToAppFilled /></Icon></span>}
            type="primary"
            danger
          >
            退出房间
          </Button>
        </span>
        
      ): ''}
    </div>
  )
}))

export default DeviceSelect