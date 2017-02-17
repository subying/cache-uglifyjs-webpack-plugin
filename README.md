# cache-uglifyjs-webpack-plugin

## 安装

```shell
npm install cache-uglifyjs-webpack-plugin
```

## 配置
``` javascript
var CacheUglifyjsWebpackPlugin = require('cache-uglifyjs-webpack-plugin');
//cacheDirectory 为缓存目录  其他设置参考ugfily-js
var cacheJsPlugin = new CacheUglifyjsWebpackPlugin({
    cacheDirectory: '../temp',//缓存目录
    compress: {
        warnings: false
    }
});


module.exports = {
  ...
  plugins: [
    cacheJsPlugin
  ]
};
```

