/**
 * @param {String|Array.<String>} paths
 * @param {String} projectDir
 */
export function makeCleanFunction( paths, projectDir ) {
  var path = require( 'path' );
  if ( typeof paths === 'string' ) {
    paths = path.resolve( projectDir, paths );
  } else {
    paths = paths.map( glob => path.resolve( projectDir, glob ) );
  }
  return done => {
    require( 'del' )( paths, done );
  };
};
