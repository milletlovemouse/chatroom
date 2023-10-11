import { DeleteFilled, EditFilled } from "@ant-design/icons";
import React, { memo, useMemo } from "react";
import { Merge } from "../utils/type";
import { MenuItem, MenuList } from "./menu/menu";
import style from "./FileList.module.less";
import useMenu from "../hooks/useMenu";
import { useEditImage } from "./edit/EditImage";

type Img = {
  file: File,
  url: string
}

interface Emits {
  remove: (value?: Img, index?: number) => void,
  updateImage: (value?: Img, index?: number) => void
}

interface Props extends Emits {
  fileList: Array<Img>
}
const FileList = memo((props: Props) => {
  const isImage = (file: File) => file.type.match('image')
  const images = useMemo(() => props.fileList.map(fileItem => ({
    file: fileItem.file,
    url: isImage(fileItem.file) ? URL.createObjectURL(fileItem.file) : fileItem.url
  })), [props.fileList])
  
  const menuList: MenuList = [
    {
      name: '编辑图片',
      icon: <EditFilled />,
      methods: edit
    },
    {
      name: '删除',
      icon: <DeleteFilled />,
      methods: remove
    },
  ]
  
  function getMenuList(img: Img) {
    if (isImage(img.file)) {
      return menuList.map(menu => ({...menu, img}))
    }
    return [{...menuList[1], img}]
  }
  
  type Menu = Merge<MenuItem, {img: Img}>;
  let close = () => {}
  function edit(value: Menu) {
    const { img } = value;
    const index = images.findIndex(item => item.file === img.file);
    close = useEditImage(img, (newImg) =>{
      props.updateImage(newImg, index);
      close()
    });
  }
  
  function updateImage(newImg: Img, oldImg: Img) {
    const index = images.findIndex(item => item === oldImg);
    props.updateImage(newImg, index);
  }
  
  function remove(value: Menu) {
    const { img } = value;
    const index = images.findIndex(item => item.file === img.file);
    props.remove(img, index);
  }

  const onContextmenu = (event: React.MouseEvent, img: Img) => {
    event.preventDefault();
    event.stopPropagation();
    const menuList = getMenuList(img)
    useMenu(event.nativeEvent, menuList)
  }
  return (
    <div>
      {images
        ? <div className={style.fileBox}>
            <div className="file-list">
              {images.map(img => {
                return (
                  <li
                    key={img.url}
                    onContextMenu={(e) => onContextmenu(e, img)}
                  >
                    {
                      isImage(img.file)
                        ? <img
                            // v-edit-image="{img, handler: updateImage, once: true}"
                            src={img.url}
                            title={img.file.name}
                            alt={img.file.name}
                          />
                        : <img
                            src={img.url}
                            title={img.file.name}
                            alt={img.file.name}
                          />
                    }
                  </li>
                )
              })}
            </div>
          </div>
        : ''
      }
    </div>
  )
})

export default FileList