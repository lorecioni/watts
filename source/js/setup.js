/**
 * Settings functions
 */

var loading = $('<img></img>')
	.addClass('loading')
	.attr('src', 'img/loading.gif')
	.attr('alt', 'loading');


$(document).ready(function(){
	
	$('#db-connection-form').submit(function(e){
		e.preventDefault();
		checkDatabaseConnection();
	});
	
	$('#verify-frame-folder').click(function(){
		getCameras($('#frame-folder-name').val());
	});
		
	$('#db-name').change(function(){
		$('#check-db-name .icon').remove();
		if($(this).val().length > 0 && $(this).val() != ''){	
			$('#check-db-name').append('<span class="icon glyphicon glyphicon-ok"></span>');
		} else {
			$('#check-db-name').append('<span class="icon glyphicon glyphicon-remove"></span>');
		}
		validateInstallationInfo()
	});
	
	$('#import-db-name').change(function(){
		$('#check-db-name .icon').remove();
		if($(this).val().length > 0 && $(this).val() != ''){	
			$('#check-db-name').append('<span class="icon glyphicon glyphicon-ok"></span>');
		} else {
			$('#check-db-name').append('<span class="icon glyphicon glyphicon-remove"></span>');
		}
		validateInstallationInfo()
	});
	
	$('#user-list-input').change(function(){
		$('#check-users .icon').remove();
		var users = $(this).tagsinput('items');
		if(users.length > 0){
			$('#check-users').append('<span class="icon glyphicon glyphicon-ok"></span>');
		} else {
			$('#check-users').append('<span class="icon glyphicon glyphicon-remove"></span>');
		}
		validateInstallationInfo()
	})
	
	$('.btn-file :file').change(function(){
		var input = $(this),
        label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
		$('#importing-data-container #filename').val(label)
		console.log('Selected file ' + label);
	});
	
	$('#verify-script').click(function(e){
		e.preventDefault();
		verifySqlScript();
	});
	
	
	$('input[name=import-data]').change(function(){
		switch($(this).val()){
			case 'new':
				$('input#import-new-data').removeAttr('checked');
				$(this).prop('checked');
				$('#new-data-container').show();
				$('#importing-data-container').hide();
				break;
			
			case 'import':
				$('input#create-new-data').removeAttr('checked');
				$(this).prop('checked');
				$('#new-data-container').hide();
				$('#importing-data-container').show();
				break;
		}
	});
	
	$('#install-button').click(function(){
		//if(!$(this).hasClass('disabled')){
			install();
		//}
	});
	
	$('#start-button').click(function(){
		window.location.href = "index.php";
	});
	
});


/**
 * Check database connection
 */
function checkDatabaseConnection(){
	console.log('Checking database connection');
	$('#check-db-connection .icon').remove();
	
	if($('#db-user').val() != '' && $('#db-password').val() != ''
			&& $('#db-host').val() != ''){

		$('#db-connection-form .form-button .message').remove();
		$('#db-connection-form .form-button').append(loading);

		$.ajax({
			type: "POST",
			url: "php/setup.php",
			data: {
				action: "test-database-connection",
				user: $('#db-user').val(),
				password: $('#db-password').val(),
				host: $('#db-host').val(),
				db: $('#db-database').val()
			},
			success: function(response){
				
				$('#db-connection-form .loading').remove();
				var label = $('<span></span>')
					.addClass('message glyphicon');
				
				
				if(response){
					console.log('Database connection success');
					label.addClass('glyphicon-ok');
					
					//Updates install summary (bottom page)
					$('#check-db-connection').append('<span class="icon glyphicon glyphicon-ok"></span>');
				} else {
					console.log('Database connection error');
					label.addClass('glyphicon-remove');
					//Updates install summary (bottom page)
					$('#check-db-connection').append('<span class="icon glyphicon glyphicon-remove"></span>');
				}
				$('#db-connection-form .form-button .message').remove();
				$('#db-connection-form .form-button').append(label);
				
				validateInstallationInfo()		
			},
			error: function(){
				$('#db-connection-form .loading').remove();
				var label = $('<span></span>')
					.addClass('message glyphicon')
					.addClass('glyphicon-remove');
				$('#db-connection-form .form-button .message').remove();
				$('#db-connection-form .form-button').append(label);	
				//Updates install summary (bottom page)
				$('#check-db-connection').append('<span class="icon glyphicon glyphicon-remove"></span>');
				validateInstallationInfo()
			}
		});	
	} else {
		$('#db-connection-form .loading').remove();
		var label = $('<span></span>')
			.addClass('message glyphicon')
			.addClass('glyphicon-remove');
		$('#db-connection-form .form-button .message').remove();
		$('#db-connection-form .form-button').append(label);
		$('#check-db-connection').append('<span class="icon glyphicon glyphicon-remove"></span>');
		validateInstallationInfo()
	}
}

/**
 * Retrieving cameras from database
 */
function getCameras(folderName){
	console.log('Retrieving cameras');
	
	$('#check-frames-folder .icon').remove();
	$('#check-camera-settings .icon').remove();
	$('#cameras-form .form-button .message').remove();
	$('#cameras-form .form-button').append(loading);
	
	$.ajax({
		type: "POST",
		url: "php/setup.php",
		data: {
			action: "get-cameras",
			folder: folderName
		},
		success: function(data){
			$('#cameras-form .loading').remove();
			var label = $('<span></span>')
				.addClass('message glyphicon');		
			
			if(data.length > 0){
				$('#cameras-form .alert')
					.removeClass('alert-warning alert-danger')
					.addClass('alert-success')
					.html('Found <b>' + data.length + '</b> cameras in the selected folder.');
				label.addClass('glyphicon-ok');
				
				var settings = '';
				for ( var i in data) {
					var id = data[i];
					settings += '<div class="form-group camera-entry" data-id="' + id + '">';
					settings += '<label for="camera-calibration-' + id + '" class="col-sm-3 control-label">Camera ' + id + '</label>';
					settings += '<div class="col-sm-8">';
					settings += '<span class="sublabel">Enable geometry</span><input type="checkbox" class="form-control" id="camera-calibration-active-' + id + '">';
					settings += '<input type="text" class="form-control" id="camera-calibration-intrinsic-' + id + '" placeholder="Intrinsic matrix">';
					settings += '<input type="text" class="form-control" id="camera-calibration-omography-' + id + '" placeholder="Omography matrix">';
					settings += '<input type="number" class="form-control" id="camera-calibration-param-' + id + '" placeholder="Parameter">';
					settings += '</div></div>';
				}
				$('#camera-settings-container').html(settings);
				$('#camera-settings').slideDown('fast');
				
				//Updates install summary
				$('#check-frames-folder').append('<span class="icon glyphicon glyphicon-ok"></span>');
				$('#check-camera-settings').append('<span class="icon glyphicon glyphicon-ok"></span>');
			} else {
				$('#cameras-form .alert')
					.removeClass('alert-warning alert-success')
					.addClass('alert-danger')
					.html('No cameras in the selected folder.');
				label.addClass('glyphicon-remove');
				$('#camera-settings').hide();
				
				//Updates install summary
				$('#check-frames-folder').append('<span class="icon glyphicon glyphicon-remove"></span>');
				$('#check-camera-settings').append('<span class="icon glyphicon glyphicon-remove"></span>');
			}
			$('#cameras-form .form-button .message').remove();
			$('#cameras-form .form-button').append(label);	
			validateInstallationInfo();
		},
		error: function(){
			$('#camera-settings .loading').remove();
			$('#cameras-form .form-button .message').remove();
			var label = $('<span></span>')
				.addClass('glyphicon')
				.addClass('glyphicon-remove');
			$('#cameras-form .form-button').append(label);
			$('#camera-settings').hide();
			//Updates install summary
			$('#check-frames-folder').append('<span class="icon glyphicon glyphicon-remove"></span>');
			$('#check-camera-settings').append('<span class="icon glyphicon glyphicon-remove"></span>');
			validateInstallationInfo()
		}
	});	
}


function validateInstallationInfo(){
	var numChecks = $('p.check-label').length;
	var checked = $('p.check-label .icon.glyphicon-ok').length;
	if(checked >= numChecks){
		if($('#install-button').hasClass('disabled')){
			$('#install-button').removeClass('disabled');		
		}
		return true;
	} else {
		if(!$('#install-button').hasClass('disabled')){
			$('#install-button').addClass('disabled');
		}
		return false;
	}
}


/** Installation procedure **/

/** install steps **/

var installSteps = 6;
var currentStep = 0;

function install(){
	if(validateInstallationInfo()){
		//WATSS is ready to be installed
		console.log('Installing WATSS');
		
		$('#install-log-container').empty();
		
		if(!$('#install-button').hasClass('disabled')){
			$('#install-button').addClass('disabled');
		}
		
		$('#install-progress').fadeIn('fast');
		var progress = $('#install-progress .progress-bar');
		progress.attr('aria-valuenow', 0).css('width', 0 + '%');
		progress.addClass('active');
		currentStep = 0;
		var type = $('input[name=import-data]:checked').val();
		
		//Database connection
		var dbUser = $('#db-user').val();
		var dbPassword = $('#db-password').val();
		var dbHost = $('#db-host').val();
		
		//Frames
		var framesFolder = $('#frame-folder-name').val();
		
		//Cameras
		var cameras = [];
		for(var i = 0; i < $('.camera-entry').length; i++){
			var id = $($('.camera-entry')[i]).data('id');
			var calibration = $('#camera-calibration-' + id).is(':checked');
			var intrinsic = $('#camera-calibration-intrinsic-' + id).val();
			var omography = $('#camera-calibration-omography-' + id).val();
			var param = $('#camera-calibration-param-' + id).val();
			cameras.push({
				id: id, 
				active: calibration,
				intrinsic: intrinsic,
				omography: omography,
				param: param
			});
		}
		
		var data = [];
		
		switch(type){
			case 'new':
				var dbName = $('#db-name').val();
				//Users
				var users = $('#user-list-input').tagsinput('items');
				var dbConnection = {user: dbUser, password: dbPassword, host: dbHost, name: dbName};
				data = {
					connection: JSON.stringify(dbConnection),
					framesFolder: framesFolder,
					cameras: JSON.stringify(cameras),
					users: JSON.stringify(users)
				};
				
				createDatabaseConnection(progress, data);
				break;
				
			case 'import':
				
				var dbName = '';
				if($('#import-script-database-name').is(':visible')){
					dbName = $('#import-db-name').val();
				}
				
				data = {
						connection: {user: dbUser, password: dbPassword, host: dbHost, name: dbName},
					};
				
				createDatabaseConnectionImport(progress, data);
				
				break;
		}
		
	}
}

/**
 * Creates database connection file
 * @param progress
 * @param data
 */
function createDatabaseConnection(progress, data){
	$.ajax({
		type: "POST",
		url: "php/setup.php",
		data: {
			action: "create-connection",
			data: data
		},
		success: function(response){
			if(response){
				currentStep += 1;
				var value = currentStep * 100/installSteps;
				
				progress.attr('aria-valuenow', value).css('width', value + '%');
				progress.html(formatNumber(value) + '%');
				generateDatabaseSchema(progress, data);
				generateLog('Created database connection file.', 'success');
			} else {
				generateLog('Error creating database connection file.', 'error');
			}
		},
		error: function(error){
			generateLog(error.responseText, 'error');
		}
	});	
}

/**
 * Creates database connection file
 * @param progress
 * @param data
 */
function createDatabaseConnectionImport(progress, data){
	$.ajax({
		type: "POST",
		url: "php/setup.php",
		data: {
			action: "create-connection",
			data: data
		},
		success: function(response){
			if(response){
				currentStep += 1;
				var value = currentStep * 100/installSteps;
				
				progress.attr('aria-valuenow', value).css('width', value + '%');
				progress.html(formatNumber(value) + '%');
				generateLog('Created database connection file.', 'success');
				
				importData(progress, data);
			} else {
				generateLog('Error creating database connection file.', 'error');
			}
		},
		error: function(error){
			generateLog(error.responseText, 'error');
		}
	});	
}

/**
 * Create database and generate tables
 * @param progress
 * @param data
 */
function generateDatabaseSchema(progress, data){
	$.ajax({
		type: "POST",
		url: "php/setup.php",
		data: {
			action: "create-schema",
			data: data
		},
		success: function(response){
			if(response){
				currentStep += 1;
				var value = currentStep * 100/installSteps;
				
				progress.attr('aria-valuenow', value).css('width', value + '%');
				progress.html(formatNumber(value) + '%');
				generateLog('Created schema and database tables.', 'success');
				
				insertCameras(progress, data);
			} else {
				generateLog('Error creating database schema.', 'error');
			}
		},
		error: function(error){
			generateLog(error.responseText, 'error');
		}
	});	
}

/**
 * Inserting cameras in db
 * @param progress
 * @param data
 */
function insertCameras(progress, data){
	$.ajax({
		type: "POST",
		url: "php/setup.php",
		data: {
			action: "insert-cameras",
			data: data
		},
		success: function(response){
			if(response){
				currentStep += 1;
				var value = currentStep * 100/installSteps;
				
				progress.attr('aria-valuenow', value).css('width', value + '%');
				progress.html(formatNumber(value) + '%');
				generateLog('Cameras inserted in database.', 'success');
				
				insertFrames(progress, data);
			} else {
				generateLog('Error inserting cameras in database.', 'error');
			}
		},
		error: function(error){
			generateLog(error.responseText, 'error');
		}
	});	
}


/**
 * Inserting frames in db, scans camera folders
 * @param progress
 * @param data
 */
function insertFrames(progress, data){
	$.ajax({
		type: "POST",
		url: "php/setup.php",
		data: {
			action: "insert-frames",
			data: data
		},
		success: function(response){
			if(response){
				currentStep += 1;
				var value = currentStep * 100/installSteps;
				
				progress.attr('aria-valuenow', value).css('width', value + '%');
				progress.html(formatNumber(value) + '%');
				generateLog('Frames inserted in database.', 'success');
				
				insertUsers(progress, data);
			} else {
				generateLog('Error inserting frames in database.', 'error');
			}
		},
		error: function(error){
			generateLog(error.responseText, 'error');
		}
	});	
}

/**
 * Inserting users in db
 * @param progress
 * @param data
 */
function insertUsers(progress, data){
	$.ajax({
		type: "POST",
		url: "php/setup.php",
		data: {
			action: "insert-users",
			data: data
		},
		success: function(response){
			if(response){
				currentStep += 1;
				var value = currentStep * 100/installSteps;
				
				progress.attr('aria-valuenow', value).css('width', value + '%');
				progress.html(formatNumber(value) + '%');
				generateLog('Users inserted in database.', 'success');
				
				insertPoi(progress, data);
			} else {
				generateLog('Error inserting users in database.', 'error');
			}
		},
		error: function(error){
			generateLog(error.responseText, 'error');
		}
	});	
}

/**
 * Inserting POI in db
 * @param progress
 * @param data
 */
function insertPoi(progress, data){
	$.ajax({
		type: "POST",
		url: "php/setup.php",
		data: {
			action: "insert-poi",
			data: data
		},
		success: function(response){
			if(response){
				currentStep += 1;
				var value = currentStep * 100/installSteps;	
				progress.attr('aria-valuenow', value).css('width', value + '%');
				progress.html(formatNumber(value) + '%');
				generateLog('POI inserted in database.', 'success');
				
				validateInstall(progress);
			} else {
				generateLog('Error inserting POI in database.', 'error');
			}
		},
		error: function(error){
			generateLog(error.responseText, 'error');
		}
	});	
}

/**
 * Checks if everything has gone ok
 */
function validateInstall(progress){
	if($('#install-log-container p.install-log-entry.error').length == 0){
		console.log('Validating install...');
		generateLog('Validating install...', 'success');
		
		setTimeout(function(){
			console.log('Installation success!');
	    	generateLog('Installation success!', 'success');
	    	progress.removeClass('active');
	    	setTimeout(function () { 
	    		$('section.install-section').fadeOut('fast', function(){
	    			$('#installation-success').fadeIn(100);
	    		});
	    	}, 2000);
		}, 2000);
	
	} else {
		console.log('Installation error');
		generateLog('Installation failed.', 'error');
		
		progress.removeClass('progress-bar-success')
			.addClass('progress-bar-danger')
			.removeClass('active');
	}
}

/** Verify and parse sql script**/
function verifySqlScript(form){
	var file = $('#input-file').prop('files')[0]; 

	 var data = new FormData();
	 data.append('file', file);
	 data.append('action', 'parse-sql-script');
	
    $.ajax({
    	url: "php/setup.php",
    	dataType: 'json',
        cache: false,
        contentType: false,
        processData: false,
        data: data,                         
        type: 'post',
        success: function(response){
        	var dbNameSet = false;
        	var errors = 0;
        	$('#import-script-response').empty();
        	$('#check-db-name .icon').remove();
        	$('#check-users .icon').remove();
        	
        	if(response.name.length > 0){
        		//Databse name set in script
        		$('#import-script-response').append('<p class="import-script-log success">Creating database <i>' 
						+ response.name + '</i></p>');
        		dbNameSet = true;
        	}
        	
        	if(response.tables.length > 0){
        		for ( var i in response.tables) {
					var table = response.tables[i];
					if(!table.success){
						errors++;
						$('#import-script-response').append('<p class="import-script-log error">Error creating table <i>' 
								+ table.name + '</i></p>');
					} else {
						$('#import-script-response').append('<p class="import-script-log success">Creating table <i>' 
								+ table.name + '</i></p>');
					}
				}
        		if(errors == 0){
        			if(dbNameSet){
        				$('#import-script-alert')
	        				.removeClass('alert-warning')
	        				.removeClass('alert-danger')
	        				.addClass('alert-success')
	        				.html('Valid script. Will be created <b>' + response.tables.length + '</b> tables');
        				$('#check-db-name').append('<span class="icon glyphicon glyphicon-ok"></span>');
        				$('#check-users').append('<span class="icon glyphicon glyphicon-ok"></span>');
        			} else {
        				$('#import-script-alert')
	        				.removeClass('alert-success')
	        				.removeClass('alert-danger')
	        				.addClass('alert-warning')
	        				.html('Valid script. Will be created <b>' + response.tables.length + '</b> tables. Missing database name.');
        				$('#import-script-database-name').show();
        				$('#check-users').append('<span class="icon glyphicon glyphicon-ok"></span>');
        			}
        		} else {
        			$('#import-script-alert')
        				.removeClass('alert-success')
	    				.removeClass('alert-warning')
	    				.addClass('alert-danger')
	    				.html('Found <b>' + errors + '</b> errors in the imported script.');
        			$('#check-db-name').append('<span class="icon glyphicon glyphicon-remove"></span>');
        		}
        	} else {
        		$('#import-script-alert')
					.removeClass('alert-success')
					.removeClass('alert-warning')
					.addClass('alert-danger')
					.html('Error validating SQL script. Check your syntax!');
        		$('#check-db-name').append('<span class="icon glyphicon glyphicon-remove"></span>');
    		}
        	validateInstallationInfo();
        	
        }, 
        error: function(error){
        	console.log(error);
        }
     });
	
}

/** Importing data **/
function importData(progress, data){
	$.ajax({
		type: "POST",
		url: "php/setup.php",
		data: {
			action: "import-data",
			data: data
		},
		success: function(response){
			if(response){
				var value = 100;
				progress.attr('aria-valuenow', value).css('width', value + '%');
				progress.html(formatNumber(value) + '%');
				generateLog('Importing data success.', 'success');
				
				validateInstall(progress);
			} else {
				generateLog('Error importing data in database.', 'error');
			}
		},
		error: function(error){
			generateLog(error.responseText, 'error');
		}
	});	
}

/**
 * Function for generating installation log
 * @param msg
 * @param type: error or success
 */
function generateLog(msg, type){
	switch(type){
		case 'success':
			$('#install-log-container').append('<p class="install-log-entry success">' + msg + '</p>');
			break;
			
		case 'error':
			$('#install-log-container').append('<p class="install-log-entry error">' + msg + '</p>');
			break;
	}
}

/**
 * Format number having always a fixed number of digits
 * @param number
 * @param digits
 * @returns
 */
function formatNumber(number){
	return Math.round(number);
}