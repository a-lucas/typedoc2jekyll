"use strict";
var generators = require('yeoman-generator');
var path = require('path');
var fs = require('fs-extra');
//var Git = require("nodegit");


module.exports = generators.Base.extend({
    // The name `constructor` is important here
    constructor: function () {
        // Calling the super constructor is important so our generator is correctly set up
        generators.Base.apply(this, arguments);
    },
    prompting: function () {
        return this.prompt([
            {
                type: 'input',
                name: 'input',
                message: 'Typedoc generated code\'s folder',
                store: true,
                filter: function (input) {
                    return path.resolve(input);
                },
                validate: (function (input) {
                    var that = this;
                    try {
                        var input = path.resolve(input);
                        var stats = fs.statSync(input);
                        if (stats.isDirectory()) {
                            var indexStats = fs.statSync(path.join(input, 'index.html'));
                            if (indexStats.isFile()) {
                                return true;
                            } else {
                                this.log('\nan index.html file must be present');
                                return false;
                            }
                        } else {
                            this.log(input, ' \nis not a valid folder');
                            return false;
                        }
                    }
                    catch (e) {
                        this.log(e);
                        that.log('\nthis folder is not there', path.resolve(input));
                        return false;
                    }
                }).bind(this)
            },
            {
                type: 'input',
                name: 'output',
                store: true,
                filter: function (input) {
                    return path.resolve(input);
                },
                message: 'Where would you like to output the result?'
            },
            {
                type: 'list',
                name: 'createout',
                choices: ['Yes', 'No'],
                default: 'Yes',
                store: true,
                message: 'The destination folder doesn\'t exist. Would you like to create it?',
                when: (function (answers) {
                    var input = answers['output'];
                    try {
                        var stats = fs.lstatSync(input);
                        if (stats.isDirectory()) {
                            return false;
                        }
                        return true;
                    } catch (e) {
                        return true;
                    }
                }).bind(this)
            },{
                type: 'list',
                name: 'nonemptyout',
                choices: ['Yes', 'No'],
                default: 'Yes',
                store: true,
                message: 'The destination folder isnt\'t empty, we will empty it. OK ?',
                when: (function (answers) {
                    var input = answers['output'];
                    try {
                        var stats = fs.lstatSync(input);
                        if (stats.isDirectory()) {
                            var files = fs.readdirSync(answers['output']);
                            return files.length > 0;
                        }
                        return false;
                    } catch (e) {
                        return false;
                    }
                }).bind(this)
            }/*,
            {
                type: 'list',
                name: 'deploy',
                choices: ['Yes', 'No'],
                default: "Yes",
                store: true,
                when: function(answers) {
                    console.log(answers);
                    return answers['createout'] !== "No" && answers['nonemptyout'] !== "No";
                },
                message: 'Do you want to automatically deploy your generated code to gh-pages ?'
            },
            {
                type: 'input',
                name: 'github',
                store: true,
                message: 'What is your main github repository URL ?',
                when: function (answers) {
                    return answers['deploy'] === 'Yes';
                },
                validate: function (msg) {

                    return true
                }
            }*/

        ]).then((function (answers) {
            this.log(answers);
            if(answers['createout'] === "Yes") {
                fs.mkdirSync(answers['output']);
            }
            if(answers['nonemptyout'] === "Yes") {
                fs.removeSync(answers['output']);
                fs.mkdirSync(answers['output']);
            }

            var files = [];
            var filesPaths = [];

            function renameFile(filename) {
                if( /^_/.test(filename)) {
                    var name = filename.substr(1);
                    return name;
                }
                console.log('--------', filename);
                return filename;
            };

            function cpAssets(basePath, destPath) {
                fs.copySync( path.join(basePath, 'assets'), path.join(destPath, 'assets'));
            }

            function updatePaths(html) {
                var refs = /href="_([a-z0-9\-\._]+\.html)"/i.exec(html)
                console.log(refs.length,  refs[0], refs[1]);
                var refs = /href=".*\/_([a-z0-9\-\._]+\.html)"/i.exec(html)
                console.log(refs.length,  refs[0], refs[1]);

                return html;
            }

            function cpFile(basePath, destPath, file) {
                fs.ensureDirSync(destPath);
                var content = fs.readFileSync( path.join(basePath, file), 'utf-8' );
                if( /^_/.test(file)) {
                    files.push(file);
                }
                filesPaths.push(path.join(destPath, renameFile(file)));
                fs.writeFileSync( path.join(destPath, renameFile(file)), content, 'utf-8');
            }

            function cpDir(basePath, destPath, dir) {
                fs.ensureDirSync(path.join(destPath, dir));

                var list = fs.readdirSync(path.join(basePath, dir));
                list.forEach(function(file) {
                    var content = fs.readFileSync( path.join(basePath, dir, file), 'utf-8' );
                    if( /^_/.test(file)) {
                        files.push(file);
                        filesPaths.push(path.join(destPath, dir, renameFile(file)));
                    } else {
                        console.log('file ', file, ' not starting with _');
                    }
                    fs.writeFileSync( path.join(destPath, dir, renameFile(file)), content, 'utf-8');
                });
            }

            function replace() {
                filesPaths.forEach(function(filePath) {
                    var content = fs.readFileSync(filePath, 'utf-8');
                    files.forEach(function(file) {
                        content = content.replace(file, file.substr(1));
                    });
                    fs.writeFileSync(filePath, content);
                })
            }
            cpAssets(answers['input'], answers['output']);
            cpFile(answers['input'], answers['output'], 'index.html');
            cpFile(answers['input'], answers['output'], 'globals.html');

            cpDir(answers['input'], answers['output'], 'modules');
            cpDir(answers['input'], answers['output'], 'classes');
            cpDir(answers['input'], answers['output'], 'interfaces');

            replace();



        }).bind(this))
    }
});

            //If Git:
/*
            var errorAndAttemptOpen = function() {
                return NodeGit.Repository.open(local);
            };

            var cloneRepository = NodeGit.Clone(cloneURL, localPath, {checkoutBranch: 'gh-pages'}).catch(errorAndAttemptOpen)
                .then(function(repository) {
                    // Access any repository methods here.
                    console.log("Is the repository bare? %s", Boolean(repository.isBare()));
                    return repoResult.openIndex();
                }).then(function(index) {
                    index.addByPath(fileToStage);

                    // this will write files to the index
                    index.write();

                    return index.writeTree();

                }).then(function(oidResult) {

                    var oid = oidResult;
                    return nodegit.Reference.nameToId(repo, "HEAD");

                }).then(function(head) {

                    return repo.getCommit(head);

                }).then(function(parent) {

                    var author = nodegit.Signature.now("Author Name", "author@email.com");
                    var committer = nodegit.Signature.now("Commiter Name", "commiter@email.com);

                    return repo.createCommit("HEAD", author, committer, "Added the Readme file for theme builder", oid, [parent]);
                }).then(function(commitId) {
                    return console.log("New Commit: ", commitId);
                });
*/

            //commit

            //push

            //voila


