/**
 * @param {Array.<String>|String} files
 * @param {String} outfile
 * @param {Function} done
 */
export function concat( files, outfile, done ) {
  var path = require( 'path' );
  var concat = require( 'gulp-concat' );
  var sourcemaps = require( 'gulp-sourcemaps' );
  var filter = require( 'gulp-filter' );
  var rename = require( 'gulp-rename' );
  var uglify = require( 'gulp-uglify' );

  var filename = path.basename( outfile );
  var dirname = path.dirname( outfile );

  return gulp.src( files )
    .pipe( sourcemaps.init() )
    .pipe( concat( filename ) )
    .pipe( sourcemaps.write() )
    .pipe( gulp.dest( dirname ) )
    .pipe( filter( filename ) )
    .pipe( uglify() )
    .pipe( rename({ extname: '.min.js' }) )
    .pipe( gulp.dest( dirname ) )
    .on( 'end', done );
};
