var $j = jQuery.noConflict();

$j(document).ready
(
	function()
	{
		/*
		**	In this section we declare global variables
		**	===========================================
		*/

		//debugging
		var verbose=false;
		//task for this session
		var jsonTaskInfo=null;
		//URLs
		//var xmlDataURL="./xml/data.xml";
		//var xmlDataURL="./xml/indicators2.xml";
		//var xmlDataURL="http://web-expresser.appspot.com/p/indicators/$/indicators.xml?startTime=1361860307673";
		//var xmlDataURL="http://web-expresser.appspot.com/p/indicators/$/indicators.xml?startTime=1361196780000";
		var xmlDataURL="http://web-expresser.appspot.com/p/indicators/$/indicators.xml";
		//var xmlDataURL="http://web-expresser.appspot.com/p/indicators/$/indicators.xml";
		var xmlGoalsDefURL="./xml/goals.xml";
		var xmlSessionGoalsDefURL=null;
		var xslTaskInfoURL="./xml/taskinfo_json.xsl";
		//var xmlContextsDefURL="http://migen.googlecode.com/svn/trunk/java/src/uk/ac/lkl/migen/system/util/urlfilecache/MoodleResourcesMap.xml";
		var xmlContextsDefURL="./xml/MoodleResourcesMap.xml";
		var xslContextsDefURL="./xml/contextsdef_json.xsl";
		var xslUsersDefURL="./xml/usersdef_json.xsl";
		var xslGoalsDefURL="./xml/goalsdef_json.xsl";
		var xslSessionGoalsDefURL="./xml/sessiongoalsdef_json.xsl";
		var xslStatesURL="./xml/states_json.xsl";
		var xslGoalsURL="./xml/goals_json.xsl";
		//xsl objects
		var xslTaskInfo=null;
		var xslContextsDef=null;
		var xslUsersDef=null;
		var xslGoalsDef=null;
		var xslSessionGoalsDef=null;
		var xslStates=null;
		var xslGoals=null;
		//database objects
		var dbContextsDef=null;
		var dbUsersDef=null;
		var dbGoalsDef=null;
		var dbSessionGoalsDef=null;
		var dbStates=null;
		var dbGoals=null;
		//misc
		var selectedTime=null;
		var pollTimeout=null;
		//flags
		var usersDisplayNeedsUpdate=true;
		var goalsDisplayNeedsUpdate=true;
		//initialise variable with browser info
		browserDetect.init();

		/*
		**	In this section we create the visible controls of the page
		**	==========================================================
		*/
		
		//set up global ajax settings
		$j.ajaxSetup
		(
			{
				dataType: "html",
				timeout: 5000,
				cache: false
			}
		);
		
		//set up dialog for displaying student's work
		var dialog=$j("#dialog");
		dialog.dialog
		(
			{
				bgiframe: true,
				autoOpen: false,
				height: 600,
//				maxHeight: 600,
//				minHeight: 200,
				width: 800,
//				maxWidth: 800,
//				minWidth: 200, 
				title: "Student Information",
				show: "slow",
				hide: "fade",
				resizable: true,
				modal: true,
				closeOnEscape: true
			}
		);

		//set up buttons
		var imgBeacon=$j('img#beacon').hide();
		var lstInterval=$j('select#interval');
		var btnPoll=$j('button#poll').button({});
		var btnRefresh=$j('button#refresh').button({});
		var btnZoomIn=$j('button#zoomin').button({});
		var btnZoomOut=$j('button#zoomout').button({});
		var btnTimeIncrease=$j('button#timeincrease').button({});
		var btnTimeDecrease=$j('button#timedecrease').button({});
		var btnToolBar=$j("input#toolbar");
		var btnEventLog=$j("input#eventlog");
		
		$j("#radio").buttonset();	

		//hide event log
		$j(".eventlog").hide();

		var element=document.getElementById('currenttime');
		
		startTime(element);

		//set up progress bar
		$j("div#progressbar").progressbar
		({
			value: true
		});

		//setup time slider
		var sliderTime=$j("div#time").slider();
		sliderTime.slider("disable");
				
		//create the tabs
		var tabs=$j('#tabs').tabs
		({
			collapsible: false,
			event: 'click',
			cache: true,
			active: false,
			heightStyle: "fill"
		});
		
		//make the tabs sortable
		tabs.find(".ui-tabs-nav").sortable
		({
			axis: "x",
			stop: function()
			{
				tabs.tabs("refresh");
			}
		});	
		
		/*
		**	In this section we define the functions
		**	=======================================
		*/


		//cdata content cannot be excluded by xslt, so we do that in javascript
		function stripCommentsFromJsonText(jsonText)
		{
			jsonText=new String(jsonText);
			var from=jsonText.indexOf('{');
			var to=jsonText.indexOf('}')+1;
			jsonText=jsonText.substring(from,to);
			return jsonText;
		}
		
		function getTasksfromContexts()
		{
			if(dbContextsDef==null)
			{
				//retrieve contexts xml data from server
				var contexts_xml=loadXMLDoc(xmlContextsDefURL);

				//retrieve xsl for contexts' definition from server if necessary
				if(xslContextsDef==null)
				{
					xslContextsDef=loadXMLDoc(xslContextsDefURL);
				}

				displayTechnicalInfo(getFormattedTime()+"parsing contexts' definitions...");

				var json_document=null;
				var document_type=null;
				
				//transform user data to json format
				json_document=transformToJason(contexts_xml,xslContextsDef);
				document_type=typeof json_document;

				var contextsdef_json=null;
					
				// code for IE
				if(document_type=="string")
				{
					contextsdef_json=json_document;
				}
				// code for Mozilla, Firefox, Opera, etc.
				else
				{
					contextsdef_json=json_document.textContent;
				}

				if(verbose==true)
				{
					alert(contextsdef_json);
				}
					
				//create json object
				var contextsdef=eval('(' + contextsdef_json + ')');
					
				//create and populate database
				try
				{
					dbContextsDef=TAFFY(contextsdef);
					displayTechnicalInfo(getFormattedTime()+"contexts' information parsed...");
				}
				catch(error)
				{
					errorDisplay(error);
					displayTechnicalInfo(getFormattedTime()+"error occured parsing context information...");
				}
				
				displaySessionInfo(getFormattedTime()+dbContextsDef().count()+" context definitions added to the database...");
				updateAvailableTasks();
			}	
		}
		
		getTasksfromContexts();
		
		//remove data
		function removeData()
		{
			//remove users and goals
			$j('div').remove('.circle');
			$j("table#goals").remove();
			usersDisplayNeedsUpdate=true;
			goalsDisplayNeedsUpdate=true;

			//remove databases
			dbUsersDef=null;
			dbGoalsDef=null;
			dbSessionGoalsDef=null;
			dbStates=null;
			dbGoals=null;
			jsonTaskInfo=null;
			//xmlGoalsDefURL=null;
			
			//clear controls
			$j("td#starttime").html("");
			$j("td#lastupdate").html("");
			$j("td#selectedtime").html("");
			sliderTime.slider("disable");
		}
		
		var nextUpdate=null;
		
		function getStartOfDayInMillisec()
		{
			var thisDate=new Date();
			var year=thisDate.getFullYear();
			var month=thisDate.getMonth();
			var day=thisDate.getDate();
			var midnight=new Date(year,month,day);
			return midnight.getTime();
		}

		//haldler for the button refresh
		function refreshData()
		{
			if(pollTimeout!==null)
			{
				//make poll and refresh button inactive
				btnPoll.attr("disabled", "disabled");
				btnRefresh.attr("disabled", "disabled");
			}
				
			$j("div#progressbar").progressbar("option","value",false);

			//get selected task
			var taskID=$j("#task").val();
			
			//parameterise url
			var taskDataURL=xmlDataURL.replace("$",taskID);
			
			if(nextUpdate===null)
			{
				nextUpdate=getStartOfDayInMillisec();
			}
			
			taskDataURL+=("?startTime="+nextUpdate);
			
			nextUpdate=new Date().getTime();

			//retrieve xml data from server
			displayTechnicalInfo(getFormattedTime()+"fetching data from server...");
			loadXMLDocAsync(taskDataURL,refreshData2,5000);		
		}
		
		function refreshData2(xml)
		{
			if(xml===null)
			{
				displayTechnicalInfo(getFormattedTime()+"data is not imported from server (timed out)...");
				
				if(pollTimeout!==null)
				{
					pollTimeout=null;
					btnPoll.removeAttr('disabled');
					btnRefresh.removeAttr('disabled');
					imgBeacon.hide();
				}
				
				return;
			}
			
			displayTechnicalInfo(getFormattedTime()+"data imported from server...");

			//retrieve xsl for task info from server if necessary
			if(xslTaskInfo==null)
			{
				xslTaskInfo=loadXMLDoc(xslTaskInfoURL);
			}
		
			//create task info json object if necessary
			var goals_xml=null;
			var session_goals_xml=null;
			var json_document=null;
			var document_type=null;
			
			if(jsonTaskInfo==null)
			{
				//transform task info to json format
				json_document=transformToJason(xml,xslTaskInfo);
				document_type=typeof json_document;
				var taskinfo_json=null;
				
				// code for IE
				if(document_type=="string")
				{
					taskinfo_json=json_document;
				}
				// code for Mozilla, Firefox, Opera, etc.
				else
				{
					taskinfo_json=json_document.textContent;
				}
				
				if(verbose==true)
				{
					alert(taskinfo_json);
				}
				
				taskinfo_json=stripCommentsFromJsonText(taskinfo_json);

				if(verbose==true)
				{
					alert(taskinfo_json);
				}
				
				//create json object
				jsonTaskInfo=eval('(' + taskinfo_json + ')');
				
				displayTechnicalInfo(getFormattedTime()+"session information parsed...");

				//update session goals definition url
				//xmlSessionGoalsDefURL=unescape(jsonTaskInfo.url);
				xmlSessionGoalsDefURL="./xml/task.xml";
				
				//retrieve goal info data from server
				goals_xml=loadXMLDoc(xmlGoalsDefURL);
				session_goals_xml=loadXMLDoc(xmlSessionGoalsDefURL);
			}

			//retrieve xsl for goals' definition from server if necessary
			if(xslGoalsDef==null)
			{
				xslGoalsDef=loadXMLDoc(xslGoalsDefURL);
			}

			if(xslSessionGoalsDef==null)
			{
				xslSessionGoalsDef=loadXMLDoc(xslSessionGoalsDefURL);
			}

			//create goals' definition database if necessary
			if(dbGoalsDef==null)
			{
				displayTechnicalInfo(getFormattedTime()+"parsing goals' definitions...");

				//transform goals' data to json format
				json_document=transformToJason(goals_xml,xslGoalsDef);
				document_type=typeof json_document;
				var goalsdef_json=null;
				
				// code for IE
				if(document_type=="string")
				{
					goalsdef_json=json_document;
				}
				// code for Mozilla, Firefox, Opera, etc.
				else
				{
					goalsdef_json=json_document.textContent;
				}
				
				if(verbose==true)
				{
					alert(goalsdef_json);
				}
				
				//create json object
				var goalsdef=eval('(' + goalsdef_json + ')');

				//create and populate database
				try
				{
					dbGoalsDef=TAFFY(goalsdef);
					displayTechnicalInfo(getFormattedTime()+"goals' definitions parsed...");
					displaySessionInfo(getFormattedTime()+dbGoalsDef().count()+" goal definitions added to the database...");
				}
				catch(error)
				{
					errorDisplay(error);
					displayTechnicalInfo(getFormattedTime()+"error occured parsing goal information...");
				}

				displayTechnicalInfo(getFormattedTime()+"parsing session goals' definitions...");

				//transform goals' data to json format
				json_document=transformToJason(session_goals_xml,xslSessionGoalsDef);
				document_type=typeof json_document;
				goalsdef_json=null;
				
				// code for IE
				if(document_type=="string")
				{
					goalsdef_json=json_document;
				}
				// code for Mozilla, Firefox, Opera, etc.
				else
				{
					goalsdef_json=json_document.textContent;
				}
				
				if(verbose==true)
				{
					alert(goalsdef_json);
				}
				
				//create json object
				goalsdef=eval('(' + goalsdef_json + ')');

				//create and populate database
				try
				{
					dbSessionGoalsDef=TAFFY(goalsdef);
					displayTechnicalInfo(getFormattedTime()+"session goals' definitions parsed...");
					displaySessionInfo(getFormattedTime()+dbSessionGoalsDef().count()+" session goal definitions added to the database...");
										
					dbSessionGoalsDef().each
					(
						function(record, recordNo)
						{
							var item=dbGoalsDef({"id":record["id"]}).first();
							dbSessionGoalsDef({"id":record["id"]}).update({"description":item.description});
						}
					);
					
					displayTechnicalInfo(getFormattedTime()+"session goals' definitions updated with goals...");
				}
				catch(error)
				{
					errorDisplay(error);
					displayTechnicalInfo(getFormattedTime()+"error occured parsing session goal information...");
				}			
			}

			//retrieve xsl for users' definition from server if necessary
			if(xslUsersDef==null)
			{
				xslUsersDef=loadXMLDoc(xslUsersDefURL);
			}
			
			displayTechnicalInfo(getFormattedTime()+"parsing users' definitions...");

			//transform user data to json format
			json_document=transformToJason(xml,xslUsersDef);
			document_type=typeof json_document;
			var usersdef_json=null;
				
			// code for IE
			if(document_type=="string")
			{
				usersdef_json=json_document;
			}
			// code for Mozilla, Firefox, Opera, etc.
			else
			{
				usersdef_json=json_document.textContent;
			}
				
			if(verbose==true)
			{
				alert(usersdef_json);
			}
				
			//create json object
			var usersdef=eval('(' + usersdef_json + ')');
				
			//create local users' database and populate it
			var dbUsersDef_local=null;

			//create and populate database
			try
			{
				dbUsersDef_local=TAFFY(usersdef);
				displayTechnicalInfo(getFormattedTime()+"users' information parsed...");
			}
			catch(error)
			{
				errorDisplay(error);
				displayTechnicalInfo(getFormattedTime()+"error occured parsing user information...");
			}
			
			//initialise global users' database
			if(dbUsersDef==null)
			{
				dbUsersDef=dbUsersDef_local;
				displaySessionInfo(getFormattedTime()+dbUsersDef_local().count()+" user definitions added to the database...");
			}
			else
			{
				//update global users' database with missing records
				var old_users=dbUsersDef().count();
				var new_users=dbUsersDef_local().count();

				if(new_users>old_users)
				{
					dbUsersDef_local.merge(dbUsersDef().get());
					dbUsersDef=dbUsersDef_local;
					displaySessionInfo(getFormattedTime()+dbUsersDef_local().count()+" user definitions added to the database...");
					usersDisplayNeedsUpdate=true;
					goalsDisplayNeedsUpdate=true;
				}
			}

			//retrieve xsl for states from server if necessary
			if(xslStates==null)
			{
				xslStates=loadXMLDoc(xslStatesURL);
			}

			displayTechnicalInfo(getFormattedTime()+"parsing information about users' state...");
			
			//transform states data to json format
			json_document=transformToJason(xml,xslStates);
			document_type=typeof json_document;
			var states_json=null;
				
			// code for IE
			if(document_type=="string")
			{
				states_json=json_document;
			}
			// code for Mozilla, Firefox, Opera, etc.
			else
			{
				states_json=json_document.textContent;
			}
			
			if(verbose==true)
			{
				alert('states: '+states_json);
			}
			
			//create json object
			var states=eval('(' + states_json + ')');

			//create local states' database and populate it
			var dbStates_local=null;

			try
			{
				dbStates_local=TAFFY(states);
				displayTechnicalInfo(getFormattedTime()+"users' state information parsed...");
			}
			catch(error)
			{
				errorDisplay(error);
				displayTechnicalInfo(getFormattedTime()+"error occured parsing users' state information...");
			}		
			
			//initialise global states' database
			if(dbStates==null)
			{
				dbStates=dbStates_local;
				displaySessionInfo(getFormattedTime()+dbStates_local().count()+" user actions (state) added to the database...");
			}
			else
			{
				//update global states' database with missing records
				var maxTime=dbStates().max("time");
				var minTime=dbStates_local().min("time");
			
				if(minTime>maxTime)
				{
					dbStates.insert(dbStates_local().get());
					displaySessionInfo(getFormattedTime()+dbStates_local().count()+" user actions (state) added to the database...");
				}
			}
			
			//retrieve xsl for goals from server if necessary
			if(xslGoals==null)
			{
				xslGoals=loadXMLDoc(xslGoalsURL);
			}

			displayTechnicalInfo(getFormattedTime()+"parsing information about users' achievements...");

			//transform goals' data to json format
			json_document=transformToJason(xml,xslGoals);
			document_type=typeof json_document;
			var goals_json=null;
				
			// code for IE
			if(document_type=="string")
			{
				goals_json=json_document;
			}
			// code for Mozilla, Firefox, Opera, etc.
			else
			{
				goals_json=json_document.textContent;
			}

			if(verbose==true)
			{
				alert('goals: '+goals_json);
			}
			
			//create json object
			var goals=eval('(' + goals_json + ')');

			//create local goals' database and populate it
			var dbGoals_local=null;

			try
			{
				dbGoals_local=TAFFY(goals);
				displayTechnicalInfo(getFormattedTime()+"users' achievement information parsed...");
			}
			catch(error)
			{
				errorDisplay(error);
				displayTechnicalInfo(getFormattedTime()+"error occured parsing users' achievement information...");
			}		

			//initialise global goals' database
			if(dbGoals==null)
			{
				dbGoals=dbGoals_local;
				displaySessionInfo(getFormattedTime()+dbGoals_local().count()+" user actions (achievement) added to the database...");
			}
			else
			{
				//update global goals' database with missing records
				var maxTime=dbGoals().max("time");
				var minTime=dbGoals_local().min("time");

				if(minTime>maxTime)
				{
					dbGoals.insert(dbGoals_local().get());
					displaySessionInfo(getFormattedTime()+dbGoals_local().count()+" user actions (achievement) added to the database...");
				}
			}
				
			//update time-related fields and slider with new times
			$j("div#progressbar").progressbar("option","value",true);
			displayTechnicalInfo(getFormattedTime()+"local data updated...");												
			updateTimeDisplay();
						
			//remove objects
			xml=null;
			dbUsersDef_local=null;
			dbStates_local=null;
			dbGoals_local=null;
			
			if(pollTimeout!==null)
			{
				pollTimeout=setTimeout(function(){refreshData()},lstInterval.val());
				btnPoll.removeAttr('disabled');
			}
		}
		
		function updateAvailableTasks()
		{
			var context_id=Number(GetURLParameter("contextid"));
			var context=dbContextsDef({"id":context_id}).first();
			var tasks=context.tasks;
			
			for(var i=0;i<tasks.length;i++)
			{
				var option='<option value="'+tasks[i].id+'"';
				
				if(i==0)
				{
					option+=' selected="selected"';
				}
				
				option+='>'+tasks[i].title+'</option>';
				$j("#task").append(option);
			}
			
			var selectedVal=$j("#task").val();
			$j("#task").attr('selval',selectedVal);
		}
		
		$j("#task").change
		(
			function(ev)
			{
				if(dbUsersDef!=null)
				{
					var confirmation=confirm("Are you sure you want to select another task?\nThis action will reset the session");

					if(confirmation==false)
					{
						$j(this).val($j(this).attr('selval'));
						return;
					}

					$j(this).attr('selval',$j(this).val());
					removeData();
				}
			}
		);
		
		function GetURLParameter(sParam)
		{
			var sPageURL = window.location.search.substring(1);
			var sURLVariables = sPageURL.split('&');
			for (var i = 0; i < sURLVariables.length; i++)
			{
				var sParameterName = sURLVariables[i].split('=');
				if (sParameterName[0] == sParam)
				{
					return sParameterName[1];
				}
			}
		}
		
		//update
		function updateTimeDisplay()
		{
			var minStateTime=dbStates().min("time");
			var maxStateTime=dbStates().max("time");
			var minGoalTime=dbGoals().min("time");
			var maxGoalTime=dbGoals().max("time");

			var statesEmpty=minStateTime==null;
			var goalsEmpty=minGoalTime==null;
			var minTimeStamp=null;
			var maxTimeStamp=null;
			
			if(statesEmpty && goalsEmpty)
			{
				return;
			}

			if(statesEmpty)
			{
				minTimeStamp=Number(minGoalTime);
				maxTimeStamp=Number(maxGoalTime);
			}
			else if(goalsEmpty)
			{
				minTimeStamp=Number(minStateTime);
				maxTimeStamp=Number(maxStateTime);
			
			}
			else
			{
				minTimeStamp=Number(minStateTime<minGoalTime?minStateTime:minGoalTime);
				maxTimeStamp=Number(maxStateTime>maxGoalTime?maxStateTime:maxGoalTime);
			}
			
			var minTime=getTime(minTimeStamp);
			var maxTime=getTime(maxTimeStamp);
			
			var disabled=sliderTime.slider("option","disabled");
				
			if(disabled==true)
			{
				sliderTime.slider("option","min",minTimeStamp);
				$j("td#starttime").html(minTime);
			}

			sliderTime.slider("option","max",maxTimeStamp);
			sliderTime.slider("option","value",maxTimeStamp);
			sliderTime.slider("enable");
			
			$j("td#lastupdate").html(maxTime);
		}

		//utility function to display exceptions caught
		function errorDisplay(error)
		{
			var message="Error occured!\n";
			message+="error name:"+error.name+"\n";
			message+="error description:"+error.message+"\n";
			message+="press OK to continue";
			alert(message);
		}

		//utility data ti display content of database tables
		function testData()
		{
			alert("testing users' definition");
			dbUsersDef().each
			(
				function(record, recordNo)
				{
					alert("id:"+record["id"]+" firstname:"+record["firstname"]+" lastname:"+record["lastname"]);
				}
			);

			alert("testing goals' definition");
			dbGoalsDef().each
			(
				function(record, recordNo)
				{
					alert("id:"+record["id"]+" description:"+record["description"]);
				}
			);

			alert("testing states");
			dbStates().each
			(
				function(record, recordNo)
				{
					alert("userid:"+record["userid"]+" time:"+record["time"]+" url:"+record["url"]+" message:"+record["message"]+" type:"+record["type"]+" value:"+record["value"]);
				}
			);

			alert("testing goals");
			dbGoals().each
			(
				function(record, recordNo)
				{
					alert("userid:"+record["userid"]+" time:"+record["time"]+" url:"+record["url"]+" message:"+record["message"]+" id:"+record["id"]+" value:"+record["value"]);
				}
			);
		}

		//utility function to form initials from two names
		function getInitials(firstname,lastname)
		{
			//firstname=firstname.trim();
			//lastname=lastname.trim();
			
			var result="";

			if(firstname.length!=0)
			{
				result+=firstname.charAt(0);
			}
			
			if(lastname.length!=0)
			{
				result+=lastname.charAt(0);
			}
		
			return result;
		}
		
		//returns the url that shows the user's state
		function getUserUrl(id)
		{
			var maxTime=dbStates({userid:id,time:{lte:selectedTime}}).max("time");

			//if there are no entries for the user return default
			if(maxTime==null)
			{
				return "default_state.html";
			}
			
			var state=dbStates({userid:id,time:maxTime}).first();
			var url=state.url;

			return url;
		}

		//computes the proper colour for a user circle
		function getUserColour(id)
		{
			var maxTime=dbStates({userid:id,time:{lte:selectedTime}}).max("time");

			//if there are no entries for the user paint it white
			if(maxTime==null)
			{
				return "white";
			}
			
			var state=dbStates({userid:id,time:maxTime}).first();
			var type=state.type;
			var value=state.value;

			if(type=="InactivityVerifier")
			{
				if(value==true)
				{
					return "orange";
				}
				else
				{
					return "green";
				}
			}
			else if(type=="FeedbackGenerated")
			{
				if(value==1000)
				{
					return "red";
				}
				else
				{
					return "green";
				}
			}
			else
			{
				return "green";
			}
		}

		//updates a user's circle with goals achieved
		function updateUserCircle(userid,goalsachieved,goalsnumber)
		{
			var circle=$j("div#user"+userid);
			var info=circle.text();
			info=info.substring(0,2);
			info="<p>"+info+"<br/>"+goalsachieved+"/"+goalsnumber+"</p>";
			circle.html(info);

			//handler for the doubleclick event of circles
			circle.dblclick
			(
				function()
				{
					dialog.html("loading page...");
					dialog.dialog("open");
					$j.ajax
					(
						{
							url: circle.attr("url"),
							success: function(data)
							{
								dialog.html(data);
							},
							error: function()
							{
								alert('an error occurred!');
							}
						}
					); 
				}
			);
		}

		//updates a goal's rectangle with the colour given
		function updateGoalRectangle(userid,goalid,colour)
		{
			var rectangleID=userid+"-"+goalid;
			var rectangle=$j("td#"+rectangleID);
			rectangle.css("background-color",colour);
		}
		
		//displays users' circles
		function displayUsers()
		{
			if(usersDisplayNeedsUpdate==false)
			{
				return;
			}
			
			dbUsersDef().each
			(
				function(record, recordNo)
				{
					var active=record["cd_visible"];
					
					//create a circle to represent the user if necessary
					if(active==false)
					{
						var id=record["id"];
						var firstname=record["firstname"];
						var lastname=record["lastname"];
						var initials=getInitials(firstname,lastname);
					
						var circle=$j('<div class="circle greencolour" id="'+"user"+id+'" title="('+id+") "+firstname+" "+lastname+'"><p>'+initials+'</p></div>');
						circle.appendTo('div#dynamics');

						dbUsersDef({"id":id}).update({"cd_visible":true});
					}
				}
			);
			
			//make all circles draggable
			$j('div.circle').draggable
			({
				containment: 'parent'
			});

			displayTechnicalInfo(getFormattedTime()+"user circles drawn...");			
			usersDisplayNeedsUpdate=false;
		}

		//paints the users' circles
		function displayStates()
		{
			dbUsersDef().each
			(
				function(record, recordNo)
				{
					var id=record["id"];
					var colour=getUserColour(id);
					var url=getUserUrl(id);
					var circle=$j("div#user"+id);
					circle.attr("url",url);

					if(colour=="orange")
					{
						circle.removeClass("greencolour");
						circle.removeClass("whitecolour");
						circle.removeClass("redcolour");
						circle.addClass("orangecolour");
					}
					else if(colour=="red")
					{
						circle.removeClass("greencolour");
						circle.removeClass("whitecolour");
						circle.removeClass("orangecolour");
						circle.addClass("redcolour");
					}
					else if(colour=="green")
					{
						circle.removeClass("redcolour");
						circle.removeClass("whitecolour");
						circle.removeClass("orangecolour");
						circle.addClass("greencolour");
					}
					else
					{
						circle.removeClass("redcolour");
						circle.removeClass("greencolour");
						circle.removeClass("orangecolour");
						circle.addClass("whitecolour");
					}
				}
			)
			
			displayTechnicalInfo(getFormattedTime()+"user state shown...");
		}

		//displays the goals' rectangles
		function displayGoals()
		{
			if(goalsDisplayNeedsUpdate==false)
			{
				return;
			}
			
			var users=dbUsersDef().select("id","firstname","lastname","ga_visible");
			var goals=dbSessionGoalsDef().select("id","description");
			var exists=$j("table#goals").length!=0;

			//if the goals' table exists append the new rows
			if(exists==true)
			{
				var rowstext="";
				
				for(var i=0;i<users.length;i++)
				{
					if(users[i][3]==false)
					{
						rowstext+="<tr>";
						rowstext+="<th>("+users[i][0]+")"+getInitials(users[i][1],users[i][2])+"</th>";

						for(var j=0;j<goals.length;j++)
						{
							rowstext+="<td class='goalsCell' id='"+users[i][0]+"-"+goals[j][0]+"'></td>";
						}

						rowstext+="</tr>";
							
						dbUsersDef({"id":users[i][0]}).update({"ga_visible":true});
					}
				}

				$j('tbody#usergoalslist').append(rowstext);
			}
			//otherwise create it
			else
			{
				var columnLength=Math.floor(95/goals.length);
				var tabletext="";
				tabletext+="<table class='goalsTable' id='goals'>";
				tabletext+="<thead>";
				tabletext+="<tr>";
				tabletext+="<th>"+""+"</th>";
	
				for(var j=0;j<goals.length;j++)
				{
					tabletext+="<th width='"+columnLength+"%'>"+goals[j][1]+"</th>";
				}
			
				tabletext+="</tr>"
				tabletext+="</thead>";
				tabletext+="<tbody id='usergoalslist'>";

				for(var i=0;i<users.length;i++)
				{
					tabletext+="<tr>";
					tabletext+="<th>("+users[i][0]+")"+getInitials(users[i][1],users[i][2])+"</th>";

					for(var j=0;j<goals.length;j++)
					{
						tabletext+="<td class='goalsCell' id='"+users[i][0]+"-"+goals[j][0]+"'></td>";
					}

					tabletext+="</tr>";

					dbUsersDef({"id":users[i][0]}).update({"ga_visible":true});
				}

				tabletext+="</tbody>";
				tabletext+="</table>";

				var table=$j(tabletext);
				table.appendTo('div#goals');
			}

			displayTechnicalInfo(getFormattedTime()+"achievement matrix drawn...");			
			goalsDisplayNeedsUpdate=false;
		}
		
		//updates the achievement table and the circles with student's achievements
		function displayScore()
		{
			var usersdef=dbUsersDef().select("id");
			var goalsdef=dbSessionGoalsDef().select("id");

			for(var i=0;i<usersdef.length;i++)
			{
				var goalsAchieved=0;
						
				for(var j=0;j<goalsdef.length;j++)
				{
					var maxTime=dbGoals({userid:usersdef[i].toString(),id:Number(goalsdef[j]),time:{lte:selectedTime}}).max("time");
					var colour="white";	//default

					//if there is no entry for this goal for this user skip the rest
					if(maxTime!=null)
					{				
						//get the last entry for this goal
						var goal=dbGoals({userid:usersdef[i].toString(),id:Number(goalsdef[j]),time:maxTime}).first();
						var value=goal.value;
						
						//if it is achieved count it
						if(value==true)
						{
							colour="green";
							goalsAchieved++;
						}
						else
						{
							//otherwise check to see if it was achieved before
							var userGoals=dbGoals({userid:usersdef[i].toString(),id:Number(goalsdef[j]),time:{lt:selectedTime}});
											
							userGoals.each
							(
								function(record, recordNo)
								{
									if(record["value"]==true)
									{
										colour="orange";
									}
								}
							);
						}
					}
										
					updateGoalRectangle(usersdef[i],goalsdef[j],colour);
				}
				
				updateUserCircle(usersdef[i],goalsAchieved,goalsdef.length);
			}
			
			displayTechnicalInfo(getFormattedTime()+"views updated with users' scores...");
		}
		
		//utility method to display informative messages the technical part
		function displayTechnicalInfo(message)
		{
			var messages=$j('textarea#technical_info');
			var exists=messages.length!=0;

			if(exists==true)
			{
				messages.val(message+'\n'+messages.val());
			}
		}

		//utility method to display informative messages about the session
		function displaySessionInfo(message)
		{
			var messages=$j('textarea#session_info');
			var exists=messages.length!=0;

			if(exists==true)
			{
				messages.val(message+'\n'+messages.val());
			}
		}
		
		//utility method to convert timestamps to human readable time
		function getTime(timestamp)
		{
			timestamp=Number(timestamp);
			var dDate=new Date(timestamp);
			var h=dDate.getHours();
			var m=dDate.getMinutes();
			var s=dDate.getSeconds();
			var sTime=h+":"+m+":"+s;
			return sTime;
		}

		//handler for the onclick event of button '+'
		btnZoomIn.click
		(
			function()
			{
				var activeTab = $j('#tabs').tabs("option","active");

				if(activeTab==0)
				{	
					if(browserDetect.browser=="Firefox")
					{
						var zoom=$j('.circle').css("-moz-transform");
						var array=zoom.split(",");
						var zoom_value=parseFloat(array[3])+0.1;
						var new_value="matrix("+zoom_value+",0,0,"+zoom_value+",0,0)";
						$j('.circle').css("-moz-transform",new_value);
					}
					else
					{
						var zoom=$j('.circle').css("zoom");
						zoom=parseFloat(zoom)+0.1;
						$j('.circle').css("zoom",zoom);
					}
				}
				else
				{
					if(browserDetect.browser=="Firefox")
					{
						var zoom=$j('.goalsTable').css("-moz-transform");
						var array=zoom.split(",");
						var zoom_value=parseFloat(array[3])+0.1;
						var new_value="matrix("+zoom_value+",0,0,"+zoom_value+",0,0)";
						$j('.goalsTable').css("-moz-transform",new_value);
					}
					else
					{
						var zoom=$j('.goalsTable').css("zoom");
						zoom=parseFloat(zoom)+0.1;
						$j('.goalsTable').css("zoom",zoom);
					}				
				}
			}
		);
		
		//handler for the onclick event of button '-'
		btnZoomOut.click
		(	
			function()
			{
				var activeTab = $j('#tabs').tabs("option","active");

				if(activeTab==0)
				{	
					if(browserDetect.browser=="Firefox")
					{
						var zoom=$j('.circle').css("-moz-transform");
						var array=zoom.split(",");
						var zoom_value=parseFloat(array[3])-0.1;
						var new_value="matrix("+zoom_value+",0,0,"+zoom_value+",0,0)";
						$j('.circle').css("-moz-transform",new_value);
					}
					else
					{
						var zoom=$j('.circle').css("zoom");
						zoom=parseFloat(zoom)-0.1;
						$j('.circle').css("zoom",zoom);
					}
				}
				else
				{
					if(browserDetect.browser=="Firefox")
					{
						var zoom=$j('.goalsTable').css("-moz-transform");
						var array=zoom.split(",");
						var zoom_value=parseFloat(array[3])-0.1;
						var new_value="matrix("+zoom_value+",0,0,"+zoom_value+",0,0)";
						$j('.goalsTable').css("-moz-transform",new_value);
					}
					else
					{
						var zoom=$j('.goalsTable').css("zoom");
						zoom=parseFloat(zoom)-0.1;
						$j('.goalsTable').css("zoom",zoom);
					}
				}
			}
		);
			
		function getFormattedTime()
		{
			var date=new Date();
			var time=date.toLocaleTimeString();
			return "["+time+"]:";
		}
		
		//handler for the onclick event of button 'tool bar'
		btnToolBar.click
		(	
			function()
			{
				var toolbar=$j(".toolbar");
				var visible=toolbar.is(":visible");

				if(visible==true)
				{
					return;
				}
				else
				{
					$j(".toolbar").show("slow");
					$j(".eventlog").hide();				
				}
			}
		);

		//handler for the onclick event of button 'event log'
		btnEventLog.click
		(	
			function()
			{
				var eventlog=$j(".eventlog");
				var visible=eventlog.is(":visible");

				if(visible==true)
				{
					return;
				}
				else
				{
					$j(".toolbar").hide();
					$j(".eventlog").show("slow");
				}
			}
		);
		
		//returns the selected amount of time to shift the slider in ms
		function getTimeStep()
		{
			var step=$j("select#timestep").val();
			step=Number(step);
			
			switch(step)
			{
				case 1:
					break;
				case 2:
					step=60;
					break;
				case 3:
					step=60*5;
					break;			
				case 4:
					step=60*10;
					break;
				case 5:
					step=60*30;
					break;
				default:
					alert("invalid timestep! setting default:1");
					step=1;
			}
			
			return step*1000;
		}

		//handler for the onclick event of button 'time increase'
		btnTimeIncrease.click
		(	
			function()
			{
				var disabled=sliderTime.slider("option","disabled");
				
				if(disabled==true)
				{
					return;
				}
				
				var value=sliderTime.slider("option","value");
				value+=getTimeStep();
				var max=sliderTime.slider("option","max");
				
				if(value>max)
				{
					value=max;
				}
				
				sliderTime.slider("option","value",value);
			}
		);

		//handler for the onclick event of button 'time decrease'
		btnTimeDecrease.click
		(	
			function()
			{
				var disabled=sliderTime.slider("option","disabled");
				
				if(disabled==true)
				{
					return;
				}

				var value=sliderTime.slider("option","value");
				value-=getTimeStep();
				var min=sliderTime.slider("option","min");
				
				if(value<min)
				{
					value=min;
				}
				
				sliderTime.slider("option","value",value);
			}
		);
		
		//handler for the onclick event of button 'event log'
		sliderTime.on
		(
			"slidechange",
			function(event, ui)
			{
				selectedTime=sliderTime.slider("option","value");

				var value=getTime(selectedTime);
				$j("td#selectedtime").html(value);
				
				//display the user circles
				displayUsers();
				
				//display the users' state
				displayStates();
				displayTechnicalInfo(getFormattedTime()+"classroom dynamics view updated...");
				
				//display the goals matrix
				displayGoals();

				//update circles and matrix with scores
				displayScore();
				displayTechnicalInfo(getFormattedTime()+"goal achievement view updated...");
			}
		);		
		
		btnPoll.click
		(
			function()
			{
				if(pollTimeout!==null)
				{
					clearTimeout(pollTimeout);
					pollTimeout=null;
					btnRefresh.removeAttr('disabled');
					imgBeacon.hide();
					return;
				}

				imgBeacon.show();
				
				//set the timeout interval
				pollTimeout=lstInterval.val();

				//get fresh data from server every n sec
				refreshData();				
			}
		);		
		
		//handler for the onclick event of button 'refresh'
		btnRefresh.click
		(
			function()
			{
				//get fresh data from server
				refreshData();				
			}
		);		
	}
);