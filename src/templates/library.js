import { register as registerTestTasks } from '../tools/test';
import { runConcurrent } from '../tools/util';
import { babel } from '../tools/babel';
import { serve as serveKarma } from '../tools/karma';
import { register as registerCommon } from './common';
import { watchGlob } from '../tools/watch';
import { watchify } from '../tools/browserify';
import { buildJsTask } from '../tools/make';
import gutil from 'gulp-util';

export function register( gulp, options ) {
  var { projectDir, platforms, outfile } = options;
  delete options.projectDir;
  delete options.test;
  delete options.outfile;

  platforms = platforms || [ 'browser', 'node' ];

  const specFiles = `${ projectDir }/test/**/*.spec.js`;
  const sourceFiles = `${ projectDir }/src/**/*`;
  const entryFile = `${ projectDir }/src/index.js`;

  var outFile;
  if ( outfile ) {
    outFile = `${ projectDir }/` + outfile;
  } else {
    outFile = `${ projectDir }/dist/${ options.standalone }.js`;
  }

  var makeJs = done => {
    babel( sourceFiles, `${ projectDir }/lib`, done );
  };

  gulp.task( 'make:js', function( done ) {
    var _ = require( 'lodash' );
    var task = _.cloneDeep( options );
    task.entry = entryFile;
    task.outfile = outFile;
    var makeBundle = done => {
      buildJsTask( task, done );
    };
    runConcurrent( [ makeBundle, makeJs ], done );
  });

  gulp.task( 'make', [ 'make:js' ] );

  registerTestTasks( gulp, {
    'all': {
      specs: specFiles,

      // Somehow, running mocha tests first can screw up the karam environment.
      platforms: platforms
    }
  });

  gulp.task( 'default', function( done ) {
    require( 'run-sequence' ).use( gulp )( 'make', 'test', done );
  });

  gulp.task( 'clean:js', function( done ) {
    require( 'del' )( `${ projectDir }/{lib,dist}`, done );
  });

  gulp.task( 'clean', [ 'clean:js' ] );

  var watch = callback => {
    watchGlob( sourceFiles, () => {
      makeJs( callback );
    });
    if ( options.standalone ) {
      watchify( entryFile, outFile, options, callback );
    }
  };

  gulp.task( 'serve', function() {
    var karma = serveKarma( specFiles, {
      autoWatch: true
    });
    watch( karma.reload );
  });

  gulp.task( 'watch', function() {
    watch( () => {
      gutil.log( 'build succeeded' );
    });
  });

  registerCommon( gulp, projectDir );
};
