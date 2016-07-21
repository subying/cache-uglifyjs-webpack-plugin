'use strict';

/*
    @description 压缩js
*/
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

const mkdirp = require('mkdirp');
const merge  = require('lodash.merge');
var   uglify = require("uglify-js");

const SourceMapConsumer = require("webpack-core/lib/source-map").SourceMapConsumer;
const SourceMapSource = require("webpack-core/lib/SourceMapSource");
const RawSource = require("webpack-core/lib/RawSource");



class CacheUglifyJsWebpackPlugin{
    constructor(options){
        this.options = merge({
            cacheDirectory: os.tmpdir() //缓存目录  默认为系统的临时目录
        },options);
    }

    /*
        @description 读取文件内容
    */
    readFile(filename){
        var result = {},content,data;
        if(fs.existsSync(filename)){
            content = fs.readFileSync(filename) || '';

            if(content){
                data = zlib.gunzipSync(content);
                result = JSON.parse(data);

            }
        }
        return result;
        
    }

    /*
        @description 获取文件名
    */
    getFileName(source){
        var hash = crypto.createHash('SHA1');
        hash.update(source);
        return hash.digest('hex')+'.uglify.gzip';
    }

    /*
        @description 保存文件
    */
    saveFile(filename,content){
        var data = zlib.gzipSync(JSON.stringify(content));
        fs.writeFile(filename,data);
    }

    apply(compiler){
        var _self = this;
        var options = this.options;
        //判断目录  如果目录不存在则创建目录
        if(!fs.existsSync(options.cacheDirectory)){
            mkdirp.sync(options.cacheDirectory);
        }

        compiler.plugin("compilation", function(compilation) {
            compilation.plugin("optimize-chunk-assets", function(chunks, callback) {
                var files = [];
                chunks.forEach(function(chunk) {
                    chunk.files.forEach(function(file) {
                        files.push(file);
                    });
                });

                files.forEach((file)=>{
                    var asset = compilation.assets[file];
                    var sourceMap, //源码的map
                        sourceAndMap,//源码和map
                        _source, //源码
                        uAST, //
                        stream,//uglify 输出源码流
                        map, //uglify 输出map
                        output = {}, //uglify 输出配置
                        uglifyFileName, //压缩缓存文件名称
                        uglifyJSON   //读取缓存文件的json
                    ;

                    //判断是否
                    if(options.sourceMap !== false) {
                        if(asset.sourceAndMap) {
                            sourceAndMap = asset.sourceAndMap();
                            sourceMap = sourceAndMap.map;
                            _source = sourceAndMap.source;
                        } else {
                            sourceMap = asset.map();
                            _source = asset.source();
                        }
                        
                    } else {
                        _source = asset.source();
                    }


                    uglifyFileName = _self.getFileName(_source);//缓存文件名
                    uglifyFileName = path.join(options.cacheDirectory, uglifyFileName);//缓存文件路径

                    uglifyJSON = _self.readFile(uglifyFileName);//缓存内容

                    //判断缓存是否存在
                    if(uglifyJSON.code){
                        stream = uglifyJSON.code;
                        map    = uglifyJSON.map;
                    }else{
                        //压缩代码
                        uAST = uglify.parse(_source, {
                            filename: file
                        });

                        //是否执行混淆
                        if(options.mangle !== false) {
                            uAST.figure_out_scope();
                            uAST.compute_char_frequency();
                            uAST.mangle_names();
                        }

                        //合并输出配置
                        output = merge({},options.output);

                        //读取map
                        if(options.sourceMap !== false) {
                            map = uglify.SourceMap({
                                file: file,
                                root: ""
                            });
                            output.source_map = map; 
                        }

                        //读取源码
                        stream = uglify.OutputStream(output);
                        uAST.print(stream);

                        stream = stream.toString();
                        map    = map.toString();

                        _self.saveFile(uglifyFileName,{
                            code: stream,
                            map: map
                        });
                    }

                    
                    if(options.sourceMap !== false){
                        compilation.assets[file] = new SourceMapSource(stream, file,JSON.parse(map), _source, sourceMap);
                    }else{
                        compilation.assets[file] =  new RawSource(stream)
                    }

                });
                
                callback();
            });

            //表示已压缩
            compilation.plugin("normal-module-loader", function(context) {
                context.minimize = true;
            });
        });

        
    }
}


module.exports = CacheUglifyJsWebpackPlugin;