/*
Gulp tasks config file
*/
var gulp = require("gulp");
var libs = require('./gulplibs');

// task paths config
const src_root = 'src';
const dist_root = 'dist';
const sourcemaps_root = '_maps';
const typings_root = '_typings';

const node_sources = [
	['**/*.ts'],
	{base: src_root, cwd: src_root}
];

const module_namespace = '#plug-task#';
const addon_libs = ['**/*.d.ts'];
const amd_sources = [
	['main.ts'],
	{base: src_root, cwd: src_root}
];

const gcc_sources = [
	['*.amd.js'],
	{base: dist_root, cwd: dist_root}
];

const watch_sources = [
	['**.ts'],
	{cwd: src_root}
];
const clean_sources = ['dist/**', '!dist'];
const prune_keeps = [];

// pure the dist folder
gulp.task('prune', function(){
	var prune = require('gulp-prune');
	var static_keep = prune_keeps.slice(0);

	return libs.sync([
		libs.src(node_sources)
	])
	.pipe(prune(dist_root, {verbose: true, map: (name) => {
		var ext = name.split('.').pop().toLowerCase();
		var names = [];
		switch (ext)
		{
			case 'ts':
				// skip typescript declare file (.d.ts)
				if (!/\.d\.ts/i.test(name))
				{
					// keep typescript compiled output file
					var name = name.replace(/\.ts$/i, '');
					name = name.replace(/\.ts$/i, '.js');

					if (name.indexOf(/\/\\/) == -1)
					{
						names.push(
							sourcemaps_root + '/' + name + '.amd.js.map',
							name + '.amd.js',
							name + '.min.js'
						);
					}
					names.push(
						name + '.js',
						typings_root + '/' + name + '.d.ts',
						sourcemaps_root + '/' + name + '.js.map'
					);
				}
				break;
		}
		// keep default static output file
		if (static_keep)
		{
			names = names.concat(static_keep);
			static_keep = false;
		}
		return names;
	}}));
});

// build typescript to javascript
function build(sources, options) {
	var ts = require("gulp-typescript");
	var sourcemaps = require('gulp-sourcemaps');
	options.typescript = require('typescript');

	// compile typescript source code
	var tsResult = libs.src(sources);
	// not single file, add file modify check
	if (!options.outFile)
	{
		var changed = require('gulp-changed');
		tsResult = tsResult.pipe(changed(dist_root, {extension: '.js'}));
	}
	tsResult = tsResult
		.pipe(sourcemaps.init())
		.pipe(ts(ts.createProject("tsconfig.json", options)));

	return [
		// output declare documents
		tsResult.dts.pipe(gulp.dest(dist_root + '/' + typings_root)),
		// output compiled code and sourcemaps file
		tsResult.js
			.pipe(libs.process_module_amd({prefix: module_namespace, export: 'main'}))
			.pipe(sourcemaps.write(
				sourcemaps_root,
				{
					includeContent: false,
					sourceRoot: libs.to_relative(dist_root + '/' + sourcemaps_root),
				}
			))
			.pipe(gulp.dest(dist_root)),
	];
}
// node module source, separate files, commonjs format
gulp.task('build:node', ['prune'], function() {
	return libs.sync(build(node_sources, {module: 'commonjs', declaration: true}));
});
// amd moudle source, single file, AMD format
gulp.task('build:amd', ['prune'], function() {
	var sync = libs.sync();
	var webs = libs.src(amd_sources).on('data', (file) => {
		var path = file.relative;
		var source = amd_sources.slice(0);
		var opts = {
			outFile: path.replace(/\.[^\.\/\\]+$/, '.amd.js'),
		};
		source[0] = addon_libs.concat(path);
		sync.add(build(source, opts));
	}).pipe(libs.pass());
	return sync.add(webs);
});
// compile amd module file
gulp.task('build:gcc', ['prune', 'build:amd'], function() {
	var gcc = require('google-closure-compiler').gulp();
	var pass = libs.pass();
	var sync = libs.sync(pass);

	libs.src(gcc_sources).on('data', (file) => {
		var path = file.relative;
		var file_out = path.replace(/\.amd\.js$/, '.min.js');
		if (path != file_out)
		{
			sync.add(
				gcc({
					// SIMPLE, ADVANCED
					compilation_level: 'SIMPLE',
					charset: 'UTF-8',
					// ECMASCRIPT3, ECMASCRIPT5, ECMASCRIPT5_STRICT,
					// ECMASCRIPT6, ECMASCRIPT6_STRICT, ECMASCRIPT6_TYPED
					language_in: 'ECMASCRIPT6',
					language_out: 'ECMASCRIPT5',
					// rewrite_polyfills: null,
					js_output_file: file_out,
					js: dist_root + '/' + path
				}).src()
				.pipe(gulp.dest(dist_root))
			);
		}
	}).pipe(pass);
	return sync;
});

// run code
var RUN_THREAD = null;
gulp.task('run', ['build'], function(done){
	var child = require('child_process');
	var fs = require('fs');
	var json = fs.readFileSync(__dirname + '/package.json', {encoding: 'utf8'});
	var conf = JSON.parse(json);

	if (RUN_THREAD)
	{
		console.log('[task.run] Stopping last process.');
		RUN_THREAD.kill();
	}
	if (conf.dev)
	{
		RUN_THREAD = child.fork(
			conf.dev,
			{execArgv: ["--harmony_spreadcalls", "--harmony_rest_parameters"]}
		);
		console.log('[task.run] child process started. process id: %d', RUN_THREAD.pid);
		RUN_THREAD.on('exit', (code) => {
			console.log('[task.run] Child Process exited with code: %d', code);
			if (RUN_THREAD === this)
			{
				RUN_THREAD = null;
			}
			done();
		});
	}
	else
	{
		console.log('[task.run] package.json no config the "dev" variable.')
		done();
	}
});

// task clean output folder
gulp.task('clean', function() {
	return require('del')(clean_sources);
});

// watch file change event and run tasks
gulp.task('watch', function() {
	var args = watch_sources.slice(0);
	args.push(['build', 'run']);
	gulp.watch.apply(gulp, args);
});

// compile all typescript sources
gulp.task('build:ts', ['build:node', 'build:amd']);
// task test, running the dev command
gulp.task('test', ['build', 'run']);
// task build, compile typescript source to js code
gulp.task('build', ['build:node', 'build:amd', 'build:gcc']);
// default task
gulp.task("default", ['test', 'watch']);