/**
 * Created by timxuan on 2016/8/1.
 */
'use strict';

let rStyleScript = /(?:\s*(<link([^>]*?)(stylesheet){1}([^>]*?)(?:\/)?>))/ig,
    linkScript = /(?:(\s*<script([^>]*)>([\s\S]*?)<\/script>))/ig,
    scriptSrc = /(?:\ssrc\s*=\s*)('([^<>']+)'|"([^<>\"]+)")/i,
    styleUrl = /(?:\shref\s*=\s*)('([^'<>]+)'|"([^"<>]+)"|[^\s\/>]+)/i,
    imgReg = /<(img)\s+[\s\S]*?\/?>/ig,
    bgReg = /url\(((?:'|")?[^<>;)]*(?:'|")?)\)/ig,
    manifestCache = fis.project.getCachePath() + '/manifest-' + fis.project.currentMedia(),
    manifestCacheJson = manifestCache + '/manifestData.json';

module.exports = function(ret, conf, settings, opt){
    let dirPath = fis.project.getProjectPath(),
        imgAttr = settings.imgAttr || 'src',
        webp = settings.webP || false,
        cacheFile = settings.cacheFile || '',
        ignoreFile = settings.ignoreFile || '',
		imgSrc;

    if(webp instanceof Array && webp.length > 0){
        webp = '\\.('+webp.join("|")+')';
        webp = new RegExp(webp,"i");
    }

    if(imgAttr instanceof Array && imgAttr.length > 0){
        imgAttr = imgAttr.join("|");
    }
	imgSrc = new RegExp("(?:\\\s(?:"+imgAttr+")\\\s*=\\\s*)('([^']+)'|\"([^\"]+)\"|[^'\"\\\s>]+)","i");

    if(cacheFile instanceof Array && cacheFile.length > 0){
        cacheFile = cacheFile.join("|");
		cacheFile = new RegExp(cacheFile,"i");
    }

    if(ignoreFile instanceof Array && ignoreFile.length > 0){
        ignoreFile = ignoreFile.join("|");
		ignoreFile = new RegExp(ignoreFile,"i");
    }

    if(!fis.util.isDir(manifestCache)){
        fis.util.mkdir(manifestCache);
    }

    if(!fis.util.isFile(manifestCacheJson)){
        writeFile(manifestCacheJson,JSON.stringify({}));
    }
	
    let manifestJson = readFile(manifestCacheJson),nullManifestJson = {};
    manifestJson = JSON.parse(manifestJson);

    //fis有更改全部更改
    let array = fis.util.find(fis.project.getProjectPath()+'/fis-conf.js');
    if(array.length <= 0){
        console.log("Can't find the fis-conf.js on ProjectRoot!");
        return;
    }
    let configPath = array[0],configTime = fis.util.mtime(configPath).getTime(),configChange = true;
    if(manifestJson[configPath] && manifestJson[configPath] == configTime){
        configChange = false;
    }
    nullManifestJson[configPath] = configTime;

    fis.util.map(ret.src,function(subpath,file,i){
        let array = [];
        if(file.isHtmlLike && file.rExt == '.html'){

            if(cacheFile && !file.origin.match(cacheFile)){
                return;
            }

            if(ignoreFile && file.origin.match(ignoreFile)){
                return;
            }

            let cacheTime = file.cache.timestamp,
                ororiginFile = file.origin,
                htmlPath = dirPath + file.release.replace(file.ext,''),
                filename = file.filename,
                Content = file.getContent(),
                fileHash = fis.util.md5(file._content),
                appcacheName = htmlPath + '_' + fileHash + '.appcache';
            if(fis.util.isFile(appcacheName) &&!configChange && manifestJson[ororiginFile] && manifestJson[ororiginFile] == fileHash){
                nullManifestJson[ororiginFile] = fileHash;
                file.setContent(replace(Content,filename,fileHash));
                return;
            }

            let linkArray = Content.match(rStyleScript),
                scriptArray = Content.match(linkScript),
                bgArray = Content.match(bgReg),
                imgArray = Content.match(imgReg);

            //css过滤
            if(linkArray){
                linkArray.forEach(function(v){
                    let href = v.match(styleUrl);
                    if(href){
                        href = RegExp.$1.replace(/\'|\"/ig,'').trim();
                        array.push(href);
                    }
                })
            }

            //js过滤
            if(scriptArray){
                scriptArray.forEach(function(v){
                    let src = v.match(scriptSrc);
                    if(src){
                        src = RegExp.$1.replace(/\'|\"/ig,'').trim();
                        array.push(src);
                    }
                })
            }

            //内嵌的css过滤
            if(bgArray){
                bgArray.forEach(function(v,i){
                    let url = v.match(bgReg),
						img = url[0] && RegExp.$1;
                    if(url){
                        url = img.replace(/\'|\"/ig,'').trim();
                        array.push(url);
                        if(webp === true || (webp && url.match(webp))){
                            url += '.webp';
                            array.push(url);
                        }
                    }
                });
            }

            //img图片过滤
            if(imgArray){
                imgArray.forEach(function(v){
                    let src = v.match(imgSrc),
						img = (src instanceof Array) && src[0] && RegExp.$1;
                    if(img && !img.match('data:') && img.match(/\.(?:jpg|png|jpeg|gif|webp)/)){
                        src = img.replace(/\'|\"/ig,'').trim();
                        array.push(src);
                        if(webp === true || (webp && src.match(webp))){
                            src += '.webp';
                            array.push(src);
                        }
                    }
                });
            }
		
            //创建appcache文件
            let srcArray = ['CACHE MANIFEST','# Time: '+ new Date().getTime(),'CACHE:',array.join('\r\n'),"NETWORK:","*"];
            writeFile(appcacheName,srcArray.join('\r\n'));

            file.setContent(replace(Content,filename,fileHash));
            nullManifestJson[ororiginFile] = fileHash;
        }
    });
    if(Object.keys(nullManifestJson).length){
        writeFile(manifestCacheJson,JSON.stringify(nullManifestJson));
    }
};

function replace(content,filename,fileHash){
    content = content.replace(/<(html)[^>]*>/i,function(m,$1){
        if($1){
            return m.replace($1,'html manifest="'+filename+'_'+ fileHash +'.appcache"');
        }
        return m;
    });
    return content;
}

function writeFile(path,data){
    fis.util.write(path, data, 'utf-8', false);
}

function readFile(path){
    return fis.util.read(path,true);
}
