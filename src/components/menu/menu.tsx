import React, { memo, ReactNode } from 'react'
import * as ReactDOM from 'react-dom/client'
import style  from './menu.module.less'

export type MenuItem = {
  /** 菜单名称 */
  name: string
  /** 菜单图标 */
  icon: ReactNode
  /** 菜单事件 */
  methods: (value: MenuItem, ...args: any[]) => void
}

export type MenuList = Array<MenuItem>
export type Props = {
  /** 菜单数据 */
  menuList: MenuList
}

export const MenuChild = memo((props: {
  menu: MenuItem
}) => {
  return (
    <li className="menu-child" onClick={() => props.menu.methods(props.menu)}>
      <span className="prefix-icon">
        { props.menu.icon }
      </span>
      <span className="menu-name">
        { props.menu.name }
      </span>
    </li>
  )
})

export const Menu = memo((props: Props) => {
  return (
    <ul className={ style.menu }>
      {props.menuList.map(item => (
        <MenuChild menu={item} key={item.name} />
      ))}
    </ul>
  )
})

export function createMenu(menuList: MenuList, style: Partial<CSSStyleDeclaration> = {}) {
  const root = document.createElement('div')
  const rootStyle = {
    ...root.style,
    ...style
  }
  Object.keys(rootStyle).forEach(key => root.style[key] = rootStyle[key])
  const close = () => {
    app.unmount()
    root.remove()
  }

  const app = ReactDOM.createRoot(root)

  app.render(<Menu menuList={menuList} />)

  const { width: bodyW, height: bodyH } = document.body.getBoundingClientRect()
  document.body.appendChild(root)
  const { left, top, width, height } = root.getBoundingClientRect()
  if (left + width > bodyW) {
    root.style.left = `${bodyW - width}px`
  }
  if (top + height > bodyH) {
    root.style.top = `${bodyH - height}px`
  }
  return close
}

export default Menu