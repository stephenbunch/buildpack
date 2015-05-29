/**
 * @param {String} glob
 * @param {Function} callback
 * @returns {FSWatcher}
 */
export function watch( glob, callback ) {
  var chokidar = require( 'chokidar' );
  var watcher = chokidar.watch( glob, {
    ignoreInitial: true
  });
  watcher.on( 'add', callback );
  watcher.on( 'unlink', callback );
  watcher.on( 'change', callback );
  callback();
  return watcher;
};
