package com.meeting.file.util;

import com.meeting.common.exception.BaseException;
import com.meeting.common.exception.FileFormatException;
import com.meeting.common.util.UUIDUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;

@Component
public class PictureUtil {

    @Value("${file.path}")
    public String path;

    @Value("${picture.reg}")
    private String reg;

    /**
     * 文件后缀名，.jpg
     */
    @Autowired
    private UUIDUtil uuidUtil;

    /**
     * 文件地址 /file/pic/{图片类型}/{uid}.jpg
     * 处理图片
     * @param type 类型
     * @param file 图片
     * @patam fileType 图片格式
     */
    public void handlePicture(String type, MultipartFile file, long uid, String fileType)
            throws IOException{
        String originalName = file.getOriginalFilename();
        String fileType_in=file.getContentType();
        if (originalName == null) {
            throw new BaseException("文件名不能为空");
        }
        if(!("image/jpeg").equals(fileType_in)&&!("image/png").equals(fileType_in)){
            throw new FileFormatException("不支持的文件格式，文件头表示的格式不支持");
        }
        if (!"jpeg".equals(fileType) && !"png".equals(fileType)) {
            throw new FileFormatException("不支持的文件格式，fileType参数");
        }
        if (!originalName.matches(reg)) {
            throw new FileFormatException("不支持的文件格式，img参数");
        }
        // 新的文件名
        String fileName = "" + uid + "." + fileType;
        // 文件目的地址
        File dest = new File(path + '/' + type + '/' + fileName);
        if(!dest.getParentFile().exists()){
            dest.getParentFile().mkdir();
        }
        file.transferTo(dest);
    }

    public byte[] openPicture(String filename, String type)
            throws FileNotFoundException {
        File source = new File(path + '/' + type + '/' + filename);
        if (source.exists() && source.isFile()) {
            InputStream inputStream = null;
            ByteArrayOutputStream outputStream = null;
            try {
                inputStream = new FileInputStream(source);
                outputStream = new ByteArrayOutputStream();
                byte[] buff = new byte[1024];
                int read = -1;
                while ((read = inputStream.read(buff)) != -1) {
                    outputStream.write(buff, 0, read);
                }
                if (outputStream.size() == 0) {
                    throw new FileNotFoundException("空文件");
                }
                return outputStream.toByteArray();
            } catch (IOException exception) {
                return null;
            } finally {
                handleClose(inputStream, outputStream);
            }
        } else {
            throw new FileNotFoundException("文件不存在");
        }
    }

    private void handleClose(InputStream inputStream, OutputStream outputStream) {
        try {
            if (inputStream != null) {
                inputStream.close();
            }
            if (outputStream != null) {
                outputStream.close();
            }
        } catch (IOException exception) {
            exception.printStackTrace();
        }
    }

}
