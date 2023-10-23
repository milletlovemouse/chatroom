import React, { forwardRef, memo, useEffect, useMemo, useRef, useState } from "react";
import { Button, Avatar } from "antd";
import { Icon } from "@ricons/utils";
import { DownToBottom } from '@ricons/carbon';
import { MessageItem } from '@/components/chat/Chat'
import style from './MessageList.module.less'
import MessageFile from "./MessageFile";

type Props = {
  messageList: MessageItem[]
}

const MessageList = memo((props: Props) => {
  const [showBottomButton, setShowBottomButton] = useState(false)
  const scrollbar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    toBottom()
  }, [props.messageList.length])

  function toBottom() {    
    setTimeout(() => {
      scrollbar.current.scrollTo({
        top: scrollbar.current.scrollHeight,
        behavior: 'smooth'
      })
    }, 50)
  }

  let show = false
  function scroll(e: React.SyntheticEvent) {
    const { height } = (e.nativeEvent.target as Element).getBoundingClientRect()
    const { scrollTop, scrollHeight } = e.nativeEvent.target as Element
    const temp = scrollTop + 100 < scrollHeight - height
    if (show !== temp) {
      show = temp
      setShowBottomButton(temp)
    }
  }

  return (
    <div className={style.container}>
      <div className="message-list" ref={scrollbar} onScroll={scroll}>
        {props.messageList.map(message => {
          return <div className={'message-item' + ' ' + (message.isSelf ? 'self' : '')} key={message.id}>
            <Avatar className="message-avatar" size={50}>{ message.username[0] }</Avatar>
            <div className="message-main">
              <div className="message-username">{ message.username }</div>
              <div className="message-content">
                {
                  message.type === 'file'
                    ? <MessageFile fileInfo={message.fileInfo} />
                    : message.text 
                }
              </div>
            </div>
          </div>
        })}
      </div>
      <div className="buts">
        {
          showBottomButton
            ? <Button
                className="to-bottom"
                onClick={toBottom}
                type="primary"
                shape="circle"
                icon={<span className="anticon"><Icon><DownToBottom /></Icon></span>}
              />
            : null
        }
      </div>
    </div>
  )
})

export default MessageList;