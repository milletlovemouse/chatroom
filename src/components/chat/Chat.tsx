import React, { forwardRef, memo, Ref, useContext, useImperativeHandle, useMemo, useState } from 'react';
import { Context } from '@/pages/chatroom'
import getFileTypeImage from '/@/utils/file-type-image';
import { sliceFileAndBlobToBase64 } from '/@/utils/fileUtils';
import { formatDate } from '/@/utils/formatDate';
import style from './Chat.module.less';
import MessageList from '@/components/chat/MessageList';
import { Icon } from '@ricons/utils';
import { ImageOutline } from '@ricons/ionicons5';
import { DriveFileMoveRound } from '@ricons/material';
import usefileSelect, { AcceptType } from '/@/hooks/useFileSelect';
import FileList from '@/components/FileList';
import { Button } from 'antd';

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
  avatar: ReturnType<typeof createAvatar>;
}
type FileInfo = Awaited<ReturnType<typeof getFileInfo>>

const Chat = memo(forwardRef((props: Props, ref: Ref<RefType>) => {  
  const rtc = useContext(Context)
  rtc.off('message')
  rtc.on('message', async (message: MessageItem) =>{
    message.isSelf = false
    messageList.push(message)
    setMessageList([...messageList])
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

  const fileSelect = async () => {
    usefileSelect(selectFileConfig)
  }

  const maxlength = 100
  const [fileMessageList, setFileMessageList] = useState<MessageItem[]>([])
  const fileList = useMemo(() => fileMessageList.map(item => item.fileInfo), [fileMessageList])

  function remove(_, index: number) {
    fileMessageList.splice(index, 1);
    setFileMessageList([...fileMessageList])
  }

  function updateImage(img: FileInfo, index: number) {
    fileMessageList[index].fileInfo = {
      ...fileMessageList[index].fileInfo,
      ...img
    }
    setFileMessageList([...fileMessageList])
  }

  function sendMessage(e: React.SyntheticEvent) {
    if (e.type === 'keyup' && (e as React.KeyboardEvent).code !== 'Enter') return
    if (inputValue.length > maxlength) return
    sendTextMessage()
    sendFileMessage()
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
      text: inputValue,
      avatar: createAvatar(username[0])
    }
    rtc.channelSendMesage(messageItem)
    messageList.push(messageItem)
    setInputValue('')
    setMessageList([...messageList])
    console.log('messageList', messageList);
  }

  function sendFileMessage() {
    while(fileMessageList.length) {
      const messageItem = fileMessageList.shift()
      rtc.channelSendMesage(messageItem)
      messageList.push(messageItem)
      delete messageItem.fileInfo.chunks
    }
    setFileMessageList([])
    setMessageList([...messageList])
  }

  async function uploadFile(files: File[], err: Error, inputFiles: File[]) {
    err && console.error(err);
    const { username } = rtc.userInfo
    const date = new Date
    const { HHmmss } = formatDate(date)
    Promise.all(files.map(async file => {
      const messageItem: MessageItem = {
        id: crypto.randomUUID(),
        isSelf: true,
        username,
        HHmmss,
        type: 'file',
        fileInfo: await getFileInfo(file),
        avatar: createAvatar(username[0])
      }
      return messageItem
    })).then((list) => {
      setFileMessageList([...fileMessageList, ...list])
    })
  }

  function clearMessage() {
    setMessageList([])
    setFileMessageList([])
  }

  useImperativeHandle(ref, () => ({
    clearMessage
  }))
  return (
    <div className={style.rtcChat + ' ' + (props.open ? style.open : '')}>
      <MessageList messageList={messageList} />
      <div className="send-tool">
        <span className="tool" style={{fontSize: '1.75em'}}><Icon><ImageOutline onClick={fileSelect} /></Icon></span>
        <span className="tool" style={{fontSize: '1.75em'}}><Icon><DriveFileMoveRound onClick={fileSelect} /></Icon></span>
      </div>
      <FileList fileList={fileList} remove={remove} updateImage={updateImage}/>
      <div className="send">
        <input
          className="chat-input"
          onInput={(e) => setInputValue((e.nativeEvent.target as HTMLInputElement).value)}
          onKeyUp={sendMessage}
          placeholder="请输入消息内容"
          maxLength={maxlength}
        />
        <Button type="primary" size="large" onClick={sendMessage}>Send</Button>
      </div>
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
  let url = getFileTypeImage(name)
  let chunks = await sliceFileAndBlobToBase64(file, 180 * 1024)
  return {
    name,
    size: formatSize,
    type,
    file,
    FQ: chunks.length,
    chunks,
    url
  }
}

function createAvatar(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 50;
  canvas.height = 50;
  const cans = canvas.getContext("2d");
  cans.font = "2em Microsoft JhengHei"; //字体
  cans.fillStyle = "#333"; //字体填充颜色
  cans.textAlign = "left"; //对齐方式
  cans.textBaseline = "middle"
  cans.fillText(text, canvas.width / 3, canvas.height / 2); //被填充的文本
  return canvas.toDataURL("image/png")
}

export default Chat;