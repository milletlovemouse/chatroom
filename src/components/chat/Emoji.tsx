import React, { memo, useMemo } from "react";
import emojis from '@/assets/emojis'
import style from './Emoji.module.less'

type Props = {
  select: (emoji: string) => void
}

const Emoji = memo((props: Props) => {
  const emojiName = { smileysEmojis: '表情', peopleEmojis: '手势及人物' }
  const emojisList = useMemo(() => Object.keys(emojis).map(key => {
    return {
      key,
      name: emojiName[key],
      emojis: emojis[key] as string[]
    }
  }), [])

  return (
    <div className={style.emojis}>
      {
        emojisList.map(emojis => {
          return <ul key={emojis.key} className={emojis.key}>
            <li className="title"> { emojis.name } </li>
            {
              emojis.emojis.map(emoji => {
                return <li key={emoji} className="emoji" onClick={() => props.select(emoji)}> { emoji } </li>
              })
            }
          </ul>
        })
      }
    </div>
  )
})

export default Emoji;