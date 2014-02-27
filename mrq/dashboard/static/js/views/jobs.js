define(["jquery", "underscore", "views/generic/datatablepage", "models"],function($, _, DataTablePage, Models) {

  return DataTablePage.extend({

    el: '.js-page-jobs',

    template:"#tpl-page-jobs",

    events:{
      "click .js-datatable-filters-submit": "filterschanged",
      "click .js-datatable .js-actions button": "row_jobaction",
      "click button.js-jobs-groupaction": "groupaction"
    },

    init: function() {

      this.filters = {
        "worker": this.options.params.worker||"",
        "queue": this.options.params.queue||"",
        "path": this.options.params.path||"",
        "status": this.options.params.status||"",
        "id": this.options.params.id||"",
      };

    },

    setOptions:function(options) {
      this.options = options;
      this.init();
      this.flush();
    },

    refresh_logs:function(job_id) {

      var self = this;

      $.ajax("/api/logs?job="+job_id+"&last_log_id="+self.last_log_id, {
        "type": "GET",
        "success": function(data) {
          self.$(".js-jobs-modal .js-jobs-modal-content").html(data.logs);
          self.last_log_id = data.last_log_id;

          self.log_refresh_timeout = setTimeout(function() {
            self.log_refresh_timeout(job_id);
          }, 5000);
        },
        "error": function(xhr, status, error) {
          alert("Error: "+error);
        }
      });

    },

    groupaction: function(evt) {

      evt.preventDefault();
      evt.stopPropagation();

      var self = this;

      var action = $(evt.target).data("action");

      var data = _.clone(this.filters);
      data["action"] = action;

      self.jobaction(evt, data);

    },

    row_jobaction:function(evt) {

      evt.preventDefault();
      evt.stopPropagation();

      var self = this;

      var job_id = $(evt.target).closest(".js-actions").data("jobid");
      var action = $(evt.target).data("action");

      if (action == "viewresult") {

        $.ajax("/api/job/"+job_id+"/result", {
          "type": "GET",
          "success": function(data) {
            self.$(".js-jobs-modal .js-jobs-modal-content").html(JSON.stringify(data, null, 2));
            self.$(".js-jobs-modal h4").html("Job result");
            self.$(".js-jobs-modal").modal({});
          },
          "error": function(xhr, status, error) {
            alert("Error: "+error);
          }
        });

      } else if (action == "viewlogs") {

        self.last_log_id = "";

        self.$(".js-jobs-modal .js-jobs-modal-content").html("Loading...");
        self.$(".js-jobs-modal h4").html("Job logs");
        self.$(".js-jobs-modal").modal({});
        self.refresh_logs(job_id);
        self.$(".js-jobs-modal").on('hidden.bs.modal', function (e) {
          clearTimeout(self.log_refresh_timeout);
        });

      } else {

        self.jobaction(evt, {
          "id": job_id,
          "action": action
        });

      }

    },

    jobaction:function(evt, data) {

      $(evt.target).find(".glyphicon").addClass("spin");

      $.ajax("/api/jobaction", {
        "type": "POST",
        "data": data,
        "success": function(data) {
        },
        "error": function(xhr, status, error) {
          alert("Error: "+error);
        },
        "complete": function() {
          setTimeout(function() {
            $(evt.target).find(".glyphicon").removeClass("spin");
          }, 500);
        }
      });
    },

    renderDatatable:function() {

      var self = this;

      var datatableConfig = self.getCommonDatatableConfig("jobs");

      _.extend(datatableConfig, {
        "aoColumns": [

          {
            "sTitle": "Name",
            "sClass": "col-jobs-path",
            "mDataProp": "path",
            "fnRender": function ( o /*, val */) {
              return "<a href='/#jobs?path="+o.aData.path+"'>"+o.aData.path+"</a>"+
                "<br/><br/><a href='/#jobs?id="+o.aData._id+"'><small>"+o.aData._id+"</small></a>";
            }
          },
          {
            "sTitle": "Status",
            "sType":"string",
            "sClass": "col-jobs-status",
            "mData":function(source, type/*, val*/) {
              if (type == "display") {
                return ("<a href='/#jobs?status="+(source.status || "queued")+"'>"+(source.status || "queued")+"</a>");
              } else {
                return source.status || "queued";
              }
            }
          },
          {
            "sTitle": "Time",
            "sType":"string",
            "sClass": "col-jobs-time",
            "mData":function(source, type/*, val*/) {
              if (type == "display") {
                var display = [
                  "started "+moment.utc(source.datestarted).fromNow()
                  //"updated "+moment.utc(source.dateupdated).fromNow()
                ];

                if (source.totaltime) {
                  display.push("totaltime "+String(source.totaltime).substring(0,6)+"s");
                }
                if (source.time) {
                  display.push("cputime "+String(source.time).substring(0,6)+"s ("+source.switches+" switches)");
                }

                return "<small>" + display.join("<br/>") + "</small>";

              } else {
                return source.datestarted;
              }
            }
          },
          {
            "sTitle": "Queue",
            "sType":"string",
            "sClass": "col-jobs-queue",
            "mData":function(source, type/*, val*/) {
              if (type == "display") {
                return source.queue?("<a href='/#jobs?queue="+source.queue+"'>"+source.queue+"</a>"):"";
              } else {
                return source.queue || "";
              }

            }
          },
          {
            "sTitle": "Worker",
            "sType":"string",
            "sClass": "col-jobs-worker",
            "mData":function(source, type/*, val*/) {
              if (type == "display") {
                return source.worker?("<a href='/#jobs?worker="+source.worker+"'>"+source.worker+"</a>"):"";
              } else {
                return source.worker || "";
              }
            }
          },
          {
            "sTitle": "Params",
            "sClass": "col-jobs-params",
            "mDataProp": "params",
            "fnRender": function ( o /*, val */) {
              return "<pre>"+JSON.stringify(o.aData.params, null, 2)+"</pre>";
            }
          },
          {
            "sTitle": "Actions",
            "sType":"string",
            "sClass": "col-jobs-action",
            "mData":function(source, type) {
              if (type == "display") {
                return "<div class='js-actions' data-jobid='"+source._id+"'>"+
                  "<button class='btn btn-xs btn-default' data-action='viewlogs'><span class='glyphicon glyphicon-align-left'></span> Logs</button>"+
                  "<button class='pull-right btn btn-xs btn-default' data-action='viewresult'><span class='glyphicon glyphicon-file'></span> Result</button>"+
                  "<br/><br/>"+
                  "<button class='btn btn-xs btn-danger pull-right' data-action='cancel'><span class='glyphicon glyphicon-remove-circle'></span> Cancel</button>"+
                  "<button class='btn btn-xs btn-warning' data-action='requeue'><span class='glyphicon glyphicon-refresh'></span> Requeue</button>"+
                "</div>";
              }
              return "";
            }
          }


        ],
        "aaSorting":[ [0,'asc'] ],
      });

      this.initDataTable(datatableConfig);

      if (!_.any(this.filters, function(v, k) {
        return v;
      })) {
        this.$(".js-jobs-groupactions").hide();
      }

    },

    filterschanged:function(evt) {

      var self = this;

      if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
      }

      _.each(self.filters, function(v, k) {
        self.filters[k] = self.$(".js-datatable-filters-"+k).val();
      });
      console.log(self.filters);
      window.location = "/#jobs?"+$.param(self.filters);

    },

  });

});