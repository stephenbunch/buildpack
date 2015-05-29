import { runConcurrent } from './util';

/**
 * @param {Object.<String, String>} files
 *   A key-value pair of source glob and destination path.
 * @param {Function} done
 */
export function copy( files, done ) {
  var gulp = require( 'gulp' );
  runConcurrent(
    Object.keys( files ).map( file => {
      return done => {
        gulp.src( file )
          .pipe( gulp.dest( files[ file ] ) )
          .on( 'end', done );
      };
    }),
    done
  );
};
