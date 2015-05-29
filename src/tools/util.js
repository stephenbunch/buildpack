/**
 * @param {String} pattern
 * @returns {String}
 */
export function baseFromGlob( pattern ) {
  var glob2base = require( 'glob2base' );
  var glob = require( 'glob' );
  return glob2base( new glob.Glob( pattern ) );
};

export function runConcurrent( tasks, done ) {
  if ( tasks.length > 0 ) {
    var count = tasks.length;
    var signal = ( err, ...args ) => {
      if ( err ) {
        done( err );
      }
      if ( --count === 0 ) {
        done.apply( undefined, [ err ].concat( args ) );
      }
    };
    tasks.forEach( task => task( signal ) );
  } else {
    done();
  }
};

export function runSequential( tasks, done ) {
  tasks = tasks.slice();
  ( function next() {
    var task = tasks.shift();
    if ( task ) {
      task( next );
    } else {
      done();
    }
  } () );
};
