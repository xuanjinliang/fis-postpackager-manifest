### 安装

```javascript
   npm install fis-postpackager-manifest
```

### 使用

```javascript
       
    //fis3配置
    .match('::package', {
        postpackager: fis.plugin('manifest',{
            imgAttr:['data-webporiginal','src'],	 //检测页面中img属性包括图片地址，默认src
            webP:true,                           //开启记录webp格式,例如:***.png ***.png.webp
            cacheFile: ['2016FXFestival'],       //开启要添加缓存的文件夹下的文件，或指定文件	默认全局缓存
            ignoreFile: ['recruitArtist']        //过滤不缓存的文件夹下的所有文件，或指定文件 注:cacheFile开启后，ignoreFile不建议开启
        })
    })

```

此插件会查找所有的html文件，过滤出html中的css，script，img，内嵌css中的background-image的路径，并缓存生成 文件名+".appcache"的缓存文件，在html文件相同路径下，并且在html中动态插入appcache；

(欢迎反馈BUG，方便提升插件的质量)

