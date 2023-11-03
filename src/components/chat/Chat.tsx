import React, { forwardRef, memo, Ref, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import RTCClient from '@/utils/WebRTC/rtc-client';
import { Context } from '@/pages/chatroom'
import getFileTypeImage from '/@/utils/file-type-image';
import { fileAndBlobToBase64, sliceFileAndBlobToBase64, sliceFileOrBlob } from '/@/utils/fileUtils';
import { formatDate } from '/@/utils/formatDate';
import style from './Chat.module.less';
import MessageList from '@/components/chat/MessageList';
import { Icon } from '@ricons/utils';
import { ImageOutline } from '@ricons/ionicons5';
import { DriveFileMoveRound } from '@ricons/material';
import usefileSelect, { AcceptType, UploadConfig } from '/@/hooks/useFileSelect';
import FileList, { Img } from '@/components/FileList';
import { useDispatch } from 'react-redux'
import { addCount } from '@/store/reducers/chat';
import useWebWorkerFn from '/@/hooks/useWebWorkerFn';
import { Button } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import Emoji from '@/components/chat/Emoji';
import { EmojiSmileSlight24Regular } from '@ricons/fluent';

type Props = {
  open: boolean;
}

export type RefType = {
  clearMessage: () => void;
}

export type MessageItem = {
  id: string;
  isSelf: boolean;
  username: string;
  HHmmss: string;
  type: 'file' | 'text';
  text?: string;
  fileInfo?: FileInfo;
}
type FileInfo = Awaited<ReturnType<typeof getFileInfo>>

const Chat = memo(forwardRef((props: Props, ref: Ref<RefType>) => {
  const dispatch = useDispatch()
  const rtc = useContext<RTCClient>(Context)
  rtc.off('message')
  rtc.on('message', async (message: MessageItem) =>{
    message.isSelf = false
    messageList.push(message)
    setMessageList([...messageList])
    if (!props.open) {
      dispatch(addCount())
    }
  })

  const [inputValue, setInputValue] = useState('')
  const [messageList, setMessageList] = useState<MessageItem[]>([])

  const selectImageConfig = {
    multiple: true,
    accept: ["image/*"] as AcceptType[],
    callback: uploadFile,
    max: 1024 * 1024 * 10,
  }

  const selectFileConfig = {
    multiple: true,
    accept: ["*/*"] as AcceptType[],
    callback: uploadFile,
    max: 1024 * 1024 * 1024,
  }

  const fileSelect = (selectConfig: UploadConfig) => {
    usefileSelect(selectConfig)
  }

  const maxlength = 100
  const [fileMessageList, setFileMessageList] = useState<Img[]>([])

  function remove(_, index: number) {
    fileMessageList.splice(index, 1);
    setFileMessageList([...fileMessageList])
  }

  function updateImage(img: Img, index: number) {
    fileMessageList[index].file = img.file
    setFileMessageList([...fileMessageList])
  }

  const [loading, setLoading] = useState(false)
  async function sendMessage(e: React.SyntheticEvent) {
    if (e.type === 'keyup' && (e as React.KeyboardEvent).code !== 'Enter') return
    if (inputValue.length > maxlength || loading) return
    setLoading(true)
    sendTextMessage()
    await sendFileMessage()
    setLoading(false)
  }

  function sendTextMessage() {
    if (!inputValue.trim().length) return
    const { username } = rtc.userInfo
    const date = new Date
    const { HHmmss } = formatDate(date)
    const messageItem: MessageItem = {
      username,
      type: 'text',
      id: crypto.randomUUID(),
      isSelf: true,
      HHmmss,
      text: inputValue
    }
    rtc.channelSendMesage(messageItem)
    messageList.push(messageItem)
    setInputValue('')
    setMessageList([...messageList])
    console.log('messageList', messageList);
  }

  async function sendFileMessage() {
    const promiseAll = []
    while(fileMessageList.length) {
      const fileItem = fileMessageList.shift()
      const { username } = rtc.userInfo
      const date = new Date
      const { HHmmss } = formatDate(date)
      promiseAll.push(
        getFileInfo(fileItem.file).then((fileInfo) => {
          const messageItem: MessageItem = {
            id: crypto.randomUUID(),
            isSelf: true,
            username,
            HHmmss,
            type: 'file',
            fileInfo 
          }
          rtc.channelSendMesage(messageItem)
          messageList.push(messageItem)
          delete messageItem.fileInfo.chunks
        }).catch((error) => {
          console.error(error);
        })
      )
    }
    await Promise.all(promiseAll);
    setFileMessageList([]);
    setMessageList([...messageList]);
  }

  async function uploadFile(files: File[], err: Error, inputFiles: File[]) {
    err && console.error(err);
    setFileMessageList([...fileMessageList, ...files.map(file => {
      return {
        file,
        url: getFileTypeImage(file.name)
      }
    })])
  }

  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  function openEmoji(e: Event) {
    e.stopPropagation()
    setOpen(!open)
  }

  function selectEmoji(emoji: string) {
    setInputValue((value) => value + emoji)
    close()
  }

  function clearMessage() {
    setMessageList([])
    setFileMessageList([])
  }

  useImperativeHandle(ref, () => ({
    clearMessage
  }))

  useEffect(function onMounted() {
    document.addEventListener('click', close)
    return function onUnmounted() {
      document.removeEventListener('click', close)
    }
  }, [])
  return (
    <div className={style.rtcChat + ' ' + (props.open ? style.open : '')}>
      <MessageList messageList={messageList} />
      <div className="send-tool">
        <span className="tool" style={{fontSize: '1.75em'}}><Icon><EmojiSmileSlight24Regular onClick={(e) => openEmoji(e.nativeEvent)} /></Icon></span>
        <span className="tool" style={{fontSize: '1.75em'}}><Icon><ImageOutline onClick={() => fileSelect(selectImageConfig)} /></Icon></span>
        <span className="tool" style={{fontSize: '1.75em'}}><Icon><DriveFileMoveRound onClick={() => fileSelect(selectFileConfig)} /></Icon></span>
      </div>
      <FileList fileList={fileMessageList} remove={remove} updateImage={updateImage}/>
      <div className="send">
        { open ? <Emoji select={selectEmoji} /> : null }
        <input
          className="chat-input"
          onInput={(e) => setInputValue((e.nativeEvent.target as HTMLInputElement).value)}
          onKeyUp={sendMessage}
          placeholder="请输入消息内容"
          maxLength={maxlength}
          disabled={loading}
          value={inputValue}
        />
        <Button type="primary" size="large" loading={loading} onClick={sendMessage}>发送</Button>
      </div>
      {loading ?
        <div className='loading'>
          <LoadingOutlined />
        </div> : null
      }
    </div>
  )
}))

async function getFileInfo(file: File) {
  const { name, size, type } = file
  const kb = 1024
  const mb = 1024 * kb
  const gb = 1024 * mb
  const formatSize = size < (gb / 2)
    ? size < mb
      ? (size / kb).toFixed(2) + 'KB' 
      : (size / mb).toFixed(2) + 'MB'
    : (size / gb).toFixed(2) + 'GB';
  const url = getFileTypeImage(name)

  const { workerFn } = useWebWorkerFn(sliceFileAndBlobToBase64, {
    fnDependencies: {
      sliceFileOrBlob,
      fileAndBlobToBase64
    }
  })
  
  try {
    const chunks = await workerFn(file, 180 * 1024)
    return {
      name,
      size: formatSize,
      type,
      file,
      FQ: chunks.length,
      chunks,
      url
    }
  } catch (error) {
    return Promise.reject(error)
  }
}

export default Chat;