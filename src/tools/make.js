import { runConcurrent } from '../tools/util';
import {
  bundle,
  browserify,
  browserifyMinify
} from '../tools/browserify';
import { concat as concatJs } from '../tools/js';
import {
  buildSass,
  concatStreams as concatCssStreams,
  rewriteUrlPrefix as rewriteCssUrlPrefix,
  rewriteUrl as rewriteCssUrl
} from '../tools/css';
import { copy } from '../tools/copy';
import { buildEjs } from '../tools/ejs';

// Targets ____________________________________________________________________

/**
 * @typedef {Array.<JsTask>} JsTarget
 */

/**
 * @typedef {Array.<CssTask>} CssTarget
 */

/**
 * @typedef {Array.<SassTask>} SassTarget
 */

/**
 * @typedef {Object.<String, String>} CopyTarget
 */

/**
 * @typedef {Array.<EjsTask>} EjsTarget
 */


// Tasks ______________________________________________________________________

/**
 * @typedef {JsBrowserifyTask|JsConcatTask} JsTask
 */

/**
 * @typedef {Object} CssTask
 * @property {Array.<String, CssTaskItem>} files
 *     An array of filenames and or CssTaskItems.
 * @property {String} outfile The destination filename.
 */

/**
 * @typedef {Object} SassTask
 * @property {String} src A glob pattern as input to the sass compiler.
 * @property {String} outdir The destination directory.
 */

/**
 * @typedef {Object} EjsTask
 * @property {String} src A glob pattern as input to the ejs compiler.
 * @property {String} outdir The destination directory.
 */

// ____________________________________________________________________________

/**
 * @typedef {Object} JsBrowserifyTask
 * @property {String} entry The entry filename for browserify.
 * @property {String} outfile The destination filename.
 * @property {String} [standalone]
 *     The global name to use when packaged as a UMD.
 */

/**
 * @typedef {Object} JsConcatTask
 * @property {Array.<String>} files An array of filenames and/or glob patterns.
 * @property {String} outfile The destination filename.
 */



/**
 * @typedef {Object} CssTaskItem
 * @property {String} path A filename or glob pattern.
 * @property {CssUrlRewriteRule|Function}
 *     A CssUrlRewriteRule or async callback that takes a url and returns a
 *     new url.
 */

/**
 * @typedef {Object} CssUrlRewriteRule
 * @property {String} from The url prefix to look for.
 * @property {String} to The url prefix replacement.
 */

/**
 * @callback AsyncFunction
 * @param {Function} done
 */

/**
 * @typedef {Object} BuildGroup
 * @property {String} [baseDir]
 * @property {JsTarget} [js]
 * @property {CssTarget} [css]
 * @property {SassTarget} [sass]
 * @property {CopyTarget} [copy]
 * @property {EjsTarget} [ejs]
 */

/**
 * @param {Gulp} gulp
 * @param {Object.<String, BuildGroup>} groups
 * @param {String} projectDir
 */
export function register( gulp, groups, projectDir ) {
  var jsTasks = [];
  var cssTasks = [];
  var copyTasks = [];
  var sassTasks = [];
  var ejsTasks = [];

  for ( let groupName in groups ) {
    let group = resolveGroup( groups[ groupName ], projectDir );
    let groupTasks = [];

    if ( group.js.length > 0 ) {
      let taskName = `make:${ groupName }:js`;
      let buildJs = makeJsBuilder( group.js );
      gulp.task( taskName, buildJs );
      jsTasks.push( taskName );
      groupTasks.push( taskName );
    }

    if ( group.css.length > 0 ) {
      let taskName = `make:${ groupName }:css`;
      let buildCss = makeCssBuilder( group.css );
      gulp.task( taskName, buildCss );
      cssTasks.push( taskName );
      groupTasks.push( taskName );
    }

    if ( group.sass.length > 0 ) {
      let taskName = `make:${ groupName }:sass`;
      let buildSass = makeSassBuilder( group.sass );
      gulp.task( taskName, buildSass );
      sassTasks.push( taskName );
      groupTasks.push( taskName );
    }

    if ( Object.keys( group.copy ).length > 0 ) {
      let taskName = `make:${ groupName }:copy`;
      gulp.task( taskName, done => copy( group.copy, done ) );
      copyTasks.push( taskName );
      groupTasks.push( taskName );
    }

    if ( group.ejs.length > 0 ) {
      let taskName = `make:${ groupName }:ejs`;
      let buildEjs = makeEjsBuilder( group.ejs );
      gulp.task( taskName, buildEjs );
      ejsTasks.push( taskName );
      groupTasks.push( taskName );
    }

    if ( groupTasks.length > 0 ) {
      gulp.task( `make:${ groupName }`, groupTasks );
    }
  }

  if ( jsTasks.length > 0 ) {
    gulp.task( 'make:js', jsTasks );
  }

  if ( cssTasks.length > 0 ) {
    gulp.task( 'make:css', cssTasks );
  }

  if ( copyTasks.length > 0 ) {
    gulp.task( 'make:copy', copyTasks );
  }

  if ( sassTasks.length > 0 ) {
    gulp.task( 'make:sass', sassTasks );
  }

  if ( ejsTasks.length > 0 ) {
    gulp.task( 'make:ejs', ejsTasks );
  }

  var makeTasks = jsTasks
    .concat( cssTasks )
    .concat( copyTasks )
    .concat( sassTasks )
    .concat( ejsTasks );

  if ( makeTasks.length > 0 ) {
    gulp.task( 'make', makeTasks );
  }
};

/**
 * @param {CssTarget} target
 * @returns {AsyncFunction}
 */
export function makeCssBuilder( target ) {
  return done => {
    runConcurrent(
      target.map( task => {
        return done => buildCssTask( task, done );
      }),
      done
    );
  };
};

/**
 * @param {JsTarget} target
 * @returns {AsyncFunction}
 */
export function makeJsBuilder( target ) {
  return done => {
    runConcurrent(
      target.map( task => {
        return done => buildJsTask( task, done );
      }),
      done
    );
  };
};

/**
 * @param {SassTarget} target
 * @param {Object} [options]
 * @returns {AsyncFunction}
 */
export function makeSassBuilder( target, options ) {
  return done => {
    runConcurrent(
      target.map( task => {
        return done => buildSass( task.src, task.outdir, options, done );
      }),
      done
    );
  };
};

/**
 * @param {EjsTarget} target
 * @param {Object} [options]
 * @returns {AsyncFunction}
 */
export function makeEjsBuilder( target, options ) {
  var _ = require( 'lodash' );
  return done => {
    runConcurrent(
      target.map( task => {
        var opts = _.cloneDeep( options || {} );
        _.extend( opts, options );
        return done => buildEjs( task.src, task.outdir, opts, done );
      }),
      done
    )
  };
};

/**
 * @param {BuildGroup} group
 * @param {String} projectDir
 * @returns {BuildGroup}
 */
export function resolveGroup( group, projectDir ) {
  var _ = require( 'lodash' );
  var path = require( 'path' );
  var inputDir = path.resolve( projectDir, group.inputDir || '' );
  var outputDir = path.resolve( projectDir, group.outputDir || '' );
  group = _.extend({
    js: [],
    css: [],
    sass: [],
    copy: {},
    ejs: []
  }, group );
  group.js = group.js.map( task => resolveJsTask( task, inputDir, outputDir ) );
  group.css = group.css.map( task => resolveCssTask( task, inputDir, outputDir ) );
  group.sass = group.sass.map( task => resolveSassTask( task, inputDir, outputDir ) );
  group.copy = resolveCopyTarget( group.copy, inputDir, outputDir );
  group.ejs = group.ejs.map( task => resolveEjsTask( task, inputDir, outputDir ) );
  return group;
};

/**
 * @param {Object.<String, BuildGroup>} groups
 * @param {String} projectDir
 * @returns {Object.<String, BuildGroup>}
 */
export function resolveGroups( groups, projectDir ) {
  var ret = [];
  for ( let name in groups ) {
    ret[ name ] = resolveGroup( groups[ name ], projectDir );
  }
  return ret;
};

/**
 * @param {JsTask} task
 * @param {String} inputDir
 * @param {String} outputDir
 * @returns {JsTask}
 */
export function resolveJsTask( task, inputDir, outputDir ) {
  var _ = require( 'lodash' );
  var path = require( 'path' );
  task = _.cloneDeep( task );
  task.outfile = path.resolve( outputDir, task.outfile );
  if ( task.entry ) {
    task.entry = path.resolve( inputDir, task.entry );
  } else {
    task.files = task.files.map( x => path.resolve( inputDir, x ) );
  }
  return task;
};

/**
 * @param {CopyTarget} target
 * @param {String} inputDir
 * @param {String} outputDir
 * @returns {CopyTarget}
 */
export function resolveCopyTarget( target, inputDir, outputDir ) {
  var path = require( 'path' );
  var newTarget = {};
  for ( let file in target ) {
    newTarget[ path.resolve( inputDir, file ) ] =
      path.resolve( outputDir, target[ file ] );
  }
  return newTarget;
};

/**
 * @param {SassTask} task
 * @param {String} inputDir
 * @param {String} outputDir
 * @return {SassTask}
 */
export function resolveSassTask( task, inputDir, outputDir ) {
  var path = require( 'path' );
  return {
    src: path.resolve( inputDir, task.src ),
    outdir: path.resolve( outputDir, task.outdir )
  };
};

/**
 * @param {EjsTask} task
 * @param {String} inputDir
 * @param {String} outputDir
 * @return {EjsTask}
 */
export function resolveEjsTask( task, inputDir, outputDir ) {
  var path = require( 'path' );
  return {
    src: path.resolve( inputDir, task.src ),
    outdir: path.resolve( outputDir, task.outdir )
  };
};

/**
 * @param {CssTask} task
 * @param {String} inputDir
 * @param {String} outputDir
 * @returns {CssTask}
 */
export function resolveCssTask( task, inputDir, outputDir ) {
  var _ = require( 'lodash' );
  var path = require( 'path' );
  task = _.cloneDeep( task );
  task.outfile = path.resolve( outputDir, task.outfile );
  task.files = task.files.map( file => {
    if ( typeof file === 'string' ) {
      return path.resolve( inputDir, file );
    } else {
      file.path = path.resolve( inputDir, file.path );
      return file;
    }
  });
  return task;
};

/**
 * @param {JsTask} task
 * @param {Function} done
 */
export function buildJsTask( task, done ) {
  var path = require( 'path' );
  var _ = require( 'lodash' );

  if ( task.entry ) {
    let stdOptions = _.cloneDeep( task );
    delete stdOptions.entry;
    delete stdOptions.outfile;

    let standard = done => {
      bundle(
        browserify( task.entry, stdOptions ),
        task.outfile,
        done
      );
    };

    let minOptions = _.cloneDeep( stdOptions );
    _.extend( minOptions, {
      debug: false,
      uglify: true
    });

    let minified = done => {
      bundle(
        browserify( task.entry, minOptions ),
        path.dirname( task.outfile ) + '/' + path.basename( task.outfile, '.js' ) + '.min.js',
        done
      );
    };

    runConcurrent( [ standard, minified ], done );
  } else {
    concatJs( task.files, task.outfile, done );
  }
};

/**
 * @param {CssTask} task
 * @param {Function} done
 */
export function buildCssTask( task, done ) {
  concatCssStreams(
    task.files.map( file => {
      if ( typeof file === 'string' ) {
        return gulp.src( file );
      } else {
        var stream = gulp.src( file.path );
        if ( file.rewriteUrl ) {
          if ( typeof file.rewriteUrl === 'function' ) {
            stream = stream.pipe( rewriteCssUrl( rewriteUrl ) );
          } else {
            stream = stream.pipe( rewriteCssUrlPrefix( file.rewriteUrl.from, file.rewriteUrl.to ) );
          }
        }
        return stream;
      }
    }),
    task.outfile,
    done
  );
};
