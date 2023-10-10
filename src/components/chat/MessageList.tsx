import React, { forwardRef, memo, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "antd";
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
    scrollbar.current.scrollTop = scrollbar.current.scrollHeight
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
    <div className={style.container} ref={scrollbar} onScroll={scroll}>
      <div className="message-list">
        {props.messageList.map(message => {
          return <div className={'message-item' + ' ' + (message.isSelf ? 'self' : '')} key={message.id}>
            <div className="message-avatar">
              <img src={message.avatar} />
            </div>
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