import { start } from '../tools/node';
import { register as registerCommon } from './common';
import { babel } from '../tools/babel';
import { watchGlob } from '../tools/watch';

export function register( gulp, opts ) {
  var path = require( 'path' );
  var sourceDir = path.resolve( opts.projectDir, opts.sourceDir );
  var outDir = path.resolve( opts.projectDir, opts.outDir );
  var entry = path.resolve( opts.projectDir, opts.entry );
  var sourceFiles = `${ sourceDir }/**/*.js`;

  var nodeArgs = opts.nodeArgs || [];
  nodeArgs = nodeArgs.filter( x => !/^(--)?debug($|=)/.test( x ) );

  var serve = ( debugBrk, debuggerReady, done ) => {
    var browserSync;
    var app;
    var run = callback => {
      babel( sourceFiles, outDir, err => {
        if ( err ) {
          console.log( err.message );
          console.log( err.codeFrame );
        } else {
          if ( app ) {
            app.kill();
          }
          var portfinder = require( 'portfinder' );
          portfinder.basePort = 5858;
          portfinder.getPort( ( err, debugPort ) => {
            app = start( entry, {
              nodeArgs: nodeArgs.concat([
                `--${ debugBrk ? 'debug-brk' : 'debug' }=${ debugPort }`
              ]),
              appArgs: opts.appArgs
            }, message => {
              if ( !browserSync ) {
                browserSync = require( 'browser-sync' ).create();
                browserSync.init({
                  proxy: `localhost:${ message.port }`
                });
                callback();
              } else {
                browserSync.reload();
              }
            });
            debuggerReady( debugPort );
            debuggerReady = () => {};
          });
        }
      });
    };
    watchGlob( sourceDir, run );
    run( done );
  };

  gulp.task( 'serve', done => {
    serve( false, () => {}, done );
  });

  gulp.task( 'debug', done => {
    serve( true, debugPort => {
      var open = require( 'open' );
      var { exec } = require( 'child_process' );
      exec( 'node-inspector' );
      open( `http://127.0.0.1:8080/?ws=127.0.0.1:8080&port=${ debugPort }` );
    }, done );
  });

  gulp.task( 'make', done => {
    babel( sourceFiles, outDir, done );
  });

  registerCommon( gulp, opts.projectDir );
};
