// create a processor stream
function processor(transform)
{
	return new require('stream').Transform({
		highWaterMark: 1,
		objectMode: true,
		transform: transform
	});
}

// gulp sources stream
function src(opts)
{
	// clone options
	var option = {};
	for (var prop in opts[1]) {
		option[prop] = opts[1][prop];
	}
	return require('gulp').src(opts[0], option);
}
exports.src = src;

// calculate relative path
function to_relative(root)
{
	var path = require('path');
	var cwd = process.cwd();
	return function(file)
	{
		var relative = path.relative(
			path.dirname(path.join(cwd, root, file.relative)),
			path.join(cwd, file.cwd)
		);
		return relative.replace(/\\/g, '/');
	}
}
exports.to_relative = to_relative;

// pass through stream
function pass()
{
	return new require('stream').PassThrough({objectMode: true});
}
exports.pass = pass;

// sync and merge streams into one readable stream
function sync(streams)
{
	var total = 0;
	var caches = [];
	var waiting = false;

	function read()
	{
		while (caches.length)
		{
			var data = caches.shift().read(1);
			if (data === null)
			{
				continue;
			}
			if (this.push(data) === false)
			{
				waiting = false;
				return;
			}
		}
		if (total <= 0 && caches.length == 0)
		{
			this.push(null);
		}
		else
		{
			waiting = true;
		}
	}
	function pump(data)
	{
		caches.push(this);
		if (waiting)
		{
			read.call(stream);
		}
	}
	function end()
	{
		total--;
		if (waiting)
		{
			read.call(stream);
		}
	}
	function add(streams)
	{
		if (!(streams instanceof Array))
		{
			streams = [streams];
		}
		for (var s of streams)
		{
			total++;
			s.on('end', end).on('readable', pump).pause();
		}
		return this;
	}

	var stream = new require('stream').Readable({
		objectMode: true,
		read: read
	});
	stream.add = add;

	if (streams)
	{
		add(streams);
	}
	return stream;
}
exports.sync = sync;

// wrapper file content with head and foot
function wrapper(options)
{
	const head = new Buffer(options.head || '');
	const foot = new Buffer(options.foot || '');
	return processor((file, enc, done) =>{
		var content = file.contents;
		if (content && Buffer.isBuffer(content))
		{
			file.contents = Buffer.concat([head, content, foot]);
		}
		done(0, file);
	});
}
exports.wrapper = wrapper;

// process web module file
function process_module_amd(params) {
	var prefix = (params && params.prefix) || '';
	var export_mod = (params && params.export) || false;

	if (!prefix && !export_mod)
	{
		return pass();
	}
	const define_regx = /define\s*\((\s*"([^"]+)"\s*,\s*)\[(.+)\],\s+function\s*\(/gm;
	const depend_regx = /"([^"]+)"/g;
	function replace_define(match, id_str, id, deps) {
		id_str = (id === export_mod) ? '' : '"' + prefix + id + '", ';
		if (prefix)
		{
			deps = deps.replace(depend_regx, replace_depends);
		}
		return `define(${id_str}[${deps}], function(`;
	}
	function replace_depends(match, id) {
		if (id != 'require' && id != 'exports')
		{
			match = `"${prefix}${id}"`;
		}
		return match;
	}
	return processor((file, enc, done) => {
		if (file.isBuffer())
		{
			var code = file.contents.toString();
			code = code.replace(define_regx, replace_define);
			file.contents = new Buffer(code);
		}
		done(0, file);
	});
}
exports.process_module_amd = process_module_amd;