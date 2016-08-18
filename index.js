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

    if(imgAttr instanceof Array){
        imgAttr = imgAttr.join("|");
    }
	imgSrc = new RegExp("(?:\\\s(?:"+imgAttr+")\\\s*=\\\s*)('([^']+)'|\"([^\"]+)\"|[^'\"\\\s>]+)","i");

    if(cacheFile instanceof Array){
        cacheFile = cacheFile.join("|");
		cacheFile = new RegExp(cacheFile,"i");
    }

    if(ignoreFile instanceof Array){
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
                ororiginFile = file.origin;

            if(manifestJson[ororiginFile] && manifestJson[ororiginFile] == cacheTime){
                nullManifestJson[ororiginFile] = cacheTime;
                return;
            }

            let htmlPath = dirPath + file.release.replace(file.ext,''),
                filename = file.filename,
                Content = file.getContent();

            array.push(file.release);

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
                    let url = v.match(bgReg);
                    if(url){
                        url = RegExp.$1.replace(/\'|\"/ig,'').trim();
                        array.push(url);
                        if(webp){
                            url += '.webp';
                            array.push(url);
                        }
                    }
                });
            }

            //img图片过滤
            if(imgArray){
                imgArray.forEach(function(v){
                    let src = v.match(imgSrc);
                    if(src && !RegExp.$1.match('data:') && RegExp.$1.match(/\.(?:jpg|png|jpeg|gif|webp)/)){
                        src = RegExp.$1.replace(/\'|\"/ig,'').trim();
                        array.push(src);
                        if(webp){
                            src += '.webp';
                            array.push(src);
                        }
                    }
                })
            }

            //创建appcache文件
            let srcArray = ['CACHE MANIFEST','# Time: '+ new Date().getTime(),'CACHE:',array.join('\r\n'),"NETWORK:","*"],
                appcacheName = htmlPath + '.appcache';
            writeFile(appcacheName,srcArray.join('\r\n'));

            Content = Content.replace(/<(html)[^>]*>/i,function(m,$1){
                if($1){
                    return m.replace($1,'html manifest="'+filename+'.appcache"');
                }
                return m;
            });
            file.setContent(Content);
            nullManifestJson[ororiginFile] = cacheTime;
        }
    });
    if(Object.keys(nullManifestJson).length){
        writeFile(manifestCacheJson,JSON.stringify(nullManifestJson));
    }
};

function writeFile(path,data){
    fis.util.write(path, data, 'utf-8', false);
}

function readFile(path){
    return fis.util.read(path,true);
}