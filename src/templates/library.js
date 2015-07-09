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
  var { projectDir, platforms, outfile, watch } = options;
  delete options.projectDir;
  delete options.test;
  delete options.outfile;
  delete options.watch;

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

  var beginWatch = callback => {
    watchGlob( sourceFiles, () => {
      makeJs( callback );
    });
    var bundle;
    if ( options.standalone ) {
      bundle = watchify( entryFile, outFile, options, callback );
    }
    return () => {
      makeJs( callback );
      if ( bundle ) {
        bundle.build();
      }
    };
  };

  gulp.task( 'serve', function() {
    var karma = serveKarma( specFiles, {
      autoWatch: true
    });
    beginWatch( karma.reload );
  });

  gulp.task( 'watch', function() {
    var build = beginWatch( () => {
      gutil.log( 'build succeeded' );
    });

    // This is completely unrelated, but I needed a way to auto-refresh
    // front-ends that rely on a bootstrap library.
    if ( watch ) {
      watchGlob( watch, build );
    }
  });

  registerCommon( gulp, projectDir );
};
