import {
  bundle,
  browserify,
  watchify
} from '../tools/browserify';
import { register as registerCommon } from './common';

export function register( gulp, options ) {
  var { projectDir, entry, outfile } = options;

  entry = `${ projectDir }/${ entry }`;
  outfile = `${ projectDir }/${ outfile }`;

  delete options.projectDir;
  delete options.entry;
  delete options.outfile;

  gulp.task( 'make:js', function( done ) {
    bundle(
      browserify( entry, options ),
      outfile,
      done
    );
  });

  gulp.task( 'make', [ 'make:js' ] );

  gulp.task( 'default', [ 'make' ] );

  gulp.task( 'clean:js', function( done ) {
    require( 'del' )( `${ projectDir }/${ outfile }`, done );
  });

  gulp.task( 'clean', [ 'clean:js' ] );

  gulp.task( 'watch', function() {
    watchify( entry, outfile, options, () => {} );
  });

  registerCommon( gulp, projectDir );
};
