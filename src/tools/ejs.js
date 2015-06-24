export function buildEjs( sourceGlob, outdir, opts, done ) {
  if ( typeof opts === 'function' ) {
    done = opts;
    opts = {};
  }

  var gulp = require( 'gulp' );
  var ejs = require( 'gulp-ejs' );
  var ejsmin = require( 'gulp-ejsmin' );

  var stream = gulp.src( sourceGlob ).pipe( ejs( opts && opts.context ) );

  if ( opts ) {
    if ( opts.minify ) {
      stream = stream.pipe( ejsmin() );
    }
    if ( opts.continueOnError ) {
      stream.on( 'error', err => console.log( err ) );
    }
  }

  stream
    .pipe( gulp.dest( outdir ) )
    .on( 'end', done );
};
