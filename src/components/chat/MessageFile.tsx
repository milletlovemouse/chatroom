import { CopyFilled, DownloadOutlined } from "@ant-design/icons";
import React, { memo, useMemo } from "react";
import { MenuItem, MenuList } from "@/components/menu/menu";
import { writeClipImg } from "/@/utils/Clipboard/clipboard";
import { fileToBlob, saveFile } from "/@/utils/fileUtils";
import { Merge } from "/@/utils/type";
import style from "./messageFile.module.less";
import useMenu from "/@/hooks/useMenu";
import { usePriviewImage } from "@/components/preview/PreviewImage";

type Props = {
  fileInfo: Record<string, any>
}

const MessageFile = memo((props: Props) => {
  const isVideo = useMemo(() => {
    return !!props.fileInfo.type.match('video')
  }, [props.fileInfo.type])
  
  const isImage = useMemo(() => {
    return !!props.fileInfo.type.match('image')
  }, [props.fileInfo.type])
  
  const imageMenuList: MenuList = [
    {
      name: '复制图片',
      icon: <CopyFilled />,
      methods: copy
    },
    {
      name: '下载',
      icon: <DownloadOutlined />,
      methods: download
    }
  ]
  
  const otherMenuList: MenuList = [imageMenuList[1]]
  
  type Menu = Merge<MenuItem, {file: File}>;
  async function copy(data: Menu) {
    const blob = await fileToBlob(data.file, 'image/png')
    writeClipImg(blob)
  }
  
  function download(data: Menu) {
    saveFile(data.file)
  }

  const setMediaSrc = (image: HTMLImageElement | HTMLVideoElement) => {
    if (!image) return;
    image.src = URL.createObjectURL(props.fileInfo.file)
  }

  const onPreview = (e: MouseEvent) => {
    const { width, height, left, top } = (e.target as HTMLElement).getBoundingClientRect()
    usePriviewImage({
      url: URL.createObjectURL(props.fileInfo.file),
      name: props.fileInfo.name,
    }, {
      width,
      height,
      left,
      top,
    });
  }
  
  const onContextmenu = (event: React.MouseEvent, menuList: MenuList, file: File) => {
    event.preventDefault();
    event.stopPropagation();
    useMenu(event.nativeEvent, menuList.map(item => ({...item, file})))
  }

  return (
    <div className={style.messageFile}>
      {isVideo
        ? <div className="video-box">
            <video
              ref={setMediaSrc}
              onContextMenu={(e) => onContextmenu(e, otherMenuList, props.fileInfo.file)}
              controls
              title={props.fileInfo.name}
            ></video>
          </div>
        : <div className="img-box">
            {isImage
              ? <img
                  ref={setMediaSrc}
                  onClick={(e) => onPreview(e.nativeEvent)}
                  onContextMenu={(e) => onContextmenu(e, imageMenuList, props.fileInfo.file)}
                  title={props.fileInfo.name}
                  alt={props.fileInfo.name}
                  style={{cursor: "zoom-in"}}
                />
              : <img
                  onContextMenu={(e) => onContextmenu(e, otherMenuList, props.fileInfo.file)}
                  title={props.fileInfo.name}
                  src={props.fileInfo.url}
                  alt={props.fileInfo.name}
                />
            }
            {!isImage ? <div><span>{ props.fileInfo.size }</span></div> : ''}
          </div>
      }
    </div>
  )
})

export default MessageFile