import { baseFromGlob } from './util';

/**
 * @param {String} sourceGlob Source glob.
 * @param {String} outdir Destination path.
 * @param {Object} [opts]
 * @param {Boolean} [opts.continueOnError]
 * @param {Function} [done]
 * @returns {stream.Readable}
 */
export function buildSass( sourceGlob, outdir, opts, done ) {
  if ( typeof opts === 'function' ) {
    done = opts;
    opts = {};
  }

  var gulp = require( 'gulp' );
  var sass = require( 'gulp-sass' );
  var minify = require( 'gulp-minify-css' );
  var rename = require( 'gulp-rename' );
  var postcss = require( 'gulp-postcss' );
  var autoprefixer = require( 'autoprefixer-core' );
  var filter = require( 'gulp-filter' );
  var path = require( 'path' );
  var clone = require( 'gulp-clone' );
  var debug = require( 'gulp-debug' );
  var cssGlobbing = require( 'gulp-css-globbing' );
  var rework = require( 'gulp-rework' );
  var reworkNamespace = require( 'rework-namespace-css' );

  var stream = gulp.src( sourceGlob )
    .pipe( filter( file => !/^_/.test( path.basename( file.path ) ) ) )
    .pipe(
      cssGlobbing({
        extensions: [ '.css', '.scss' ]
      })
    )
    .pipe(
      sass({
        loadPath: [ baseFromGlob( sourceGlob ) ],
        includePaths: opts && opts.includePaths || [],
        errLogToConsole: true
      })
    );

  if ( opts ) {
    if ( opts.namespace ) {
      stream = stream.pipe(
        rework(
          reworkNamespace({
            class: opts.namespace
          })
        )
      );
    }
    if ( opts.continueOnError ) {
      stream.on( 'error', err => console.log( err ) );
    }
  }

  var cloneSink = clone.sink();
  return stream
    .pipe(
      postcss([
        autoprefixer({
          browsers: [ 'last 2 versions' ]
        })
      ])
    )
    .pipe( cloneSink )
    .pipe(
      minify({
        keepSpecialComments: 0
      })
    )
    .pipe( rename({ extname: '.min.css' }) )
    .pipe( cloneSink.tap() )
    .pipe( gulp.dest( outdir ) )
    .on( 'end', done || ( () => {} ) );
}
