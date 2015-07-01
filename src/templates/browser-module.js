import { watchify } from '../tools/browserify';
import { buildJsTask } from '../tools/make';
import { register as registerCommon } from './common';
import _ from 'lodash';
import gutil from 'gulp-util';

export function register( gulp, options ) {
  var { projectDir, entry, outfile } = options;

  entry = `${ projectDir }/${ entry }`;
  outfile = `${ projectDir }/${ outfile }`;

  delete options.projectDir;
  delete options.entry;
  delete options.outfile;

  gulp.task( 'make:js', function( done ) {
    var task = _.cloneDeep( options );
    task.entry = entry;
    task.outfile = outfile;
    buildJsTask( task, done );
  });

  gulp.task( 'make', [ 'make:js' ] );

  gulp.task( 'default', [ 'make' ] );

  gulp.task( 'clean:js', function( done ) {
    require( 'del' )( `${ projectDir }/${ outfile }`, done );
  });

  gulp.task( 'clean', [ 'clean:js' ] );

  gulp.task( 'watch', function() {
    watchify( entry, outfile, options, () => {
      gutil.log( 'build succeeded' );
    });
  });

  registerCommon( gulp, projectDir );
};
