import { baseFromGlob } from './util';

/**
 * @param {String} entry Entry file.
 * @param {String} outfile Destination path.
 * @param {Object} [opts]
 * @param {Boolean} [opts.continueOnError]
 * @param {Function} [done]
 * @returns {stream.Readable}
 */
export function buildSass( entry, outfile, opts, done ) {
  if ( typeof opts === 'function' ) {
    done = opts;
    opts = {};
  }
  opts = opts || {};
  opts.prepend = opts.prepend || [];

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
  var walk = require( 'rework-walk' );
  var concat = require( 'gulp-concat' );

  var prependFilter = filter( [ '*' ].concat(
    opts.prepend.map( x => '!' + path.basename( x ) )
  ) );

  var stream = gulp.src( opts.prepend.concat([ entry ]) )
    .pipe( prependFilter )
    .pipe(
      cssGlobbing({
        extensions: [ '.scss' ]
      })
    )
    .pipe(
      sass({
        loadPath: [ path.dirname( entry ) ],
        includePaths: opts.includePaths || [],
        errLogToConsole: true
      })
    );

  if ( opts.namespace ) {
    stream = stream.pipe(
      rework( style => {
        walk( style, ( rule, node ) => {
          // Don't touch keyframes or font-face
    			if ( !rule.selectors || rule.selectors.toString().indexOf( '@' ) >= 0 ) {
    				return rule;
          }
          rule.selectors = rule.selectors.map( selector => {
            return selector.split( '.' ).map( className => {
              if ( !className ) {
                return className;
              }
              if ( opts.namespaceExclude && opts.namespaceExclude.test( className ) ) {
                return className;
              }
              return opts.namespace + className;
            }).join( '.' );
          });
        })
      })
    );
  }

  if ( opts.continueOnError ) {
    stream.on( 'error', err => console.log( err ) );
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
    .pipe( prependFilter.restore() )
    .pipe( concat( path.basename( outfile ) ) )
    .pipe( cloneSink )
    .pipe(
      minify({
        keepSpecialComments: 0
      })
    )
    .pipe( rename({ extname: '.min.css' }) )
    .pipe( cloneSink.tap() )
    .pipe( gulp.dest( path.dirname( outfile ) ) )
    .on( 'end', done || ( () => {} ) );
};
