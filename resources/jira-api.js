"use strict";

var JIRA = {
    config: { host: '', username: '', password: '' },
    const: { MAX_SEARCH_RESULTS: 100, WORKLOGSPERPAGE: 1000 }
};

JIRA.restCall = function (apiUrl, method, data) {
    var deferred = $.Deferred();

    var request = {
        url: JIRA.config.host + '/rest/api/2/' + apiUrl,
        dataType: "json",
        crossDomain: true,
        contentType: "application/json",
        beforeSend: function (xhr) {
            // var base64 = window.btoa(JIRA.config.username + ":" + JIRA.config.password);
            xhr.withCredentials = true;
            // xhr.setRequestHeader("Authorization", "Basic " + base64);
            // xhr.setRequestHeader("X-Atlassian-Token", "nocheck");
        }
    };

    request.type = method == "POST" ? "POST" : "GET";

    if (data) {
        request.data = JSON.stringify(data);
    }

    $.ajax(request).done(function (data) {
        deferred.resolve(data);
    }).fail(function (error) {
        deferred.reject(error.statusText);
    });

    return deferred.promise();
};

JIRA.getWorkLogs = function (fromDate, toDate, ids = [], deferred = $.Deferred()) {

    JIRA.restCall('worklog/updated?since=' + fromDate.getTime()).done(function (logIds) {
        for (var i = 0; i < logIds.values.length; i++) {
            ids.push(logIds.values[i].worklogId);
        }

        if (ids.length == 0) {
            deferred.resolve({ users: [], logs: [], issues: null });
            return;
        }

        if (logIds.nextPage) {
            const newStart = new Date(+logIds.nextPage.split('since=')[1]);
            JIRA.getWorkLogs(newStart, null, ids, deferred);
            return;
        }

        JIRA._listLogs(ids, undefined, 0).then(d => {
            deferred.resolve(d);
        });

    }).fail(function (message) {
        deferred.reject(message);
    });

    return deferred.promise();
};

JIRA._listLogs = function (ids, logs = [], startAt = 0, deferred = $.Deferred()) {

    const { startDate, endDate } = Report.getStartEndDates();

    JIRA.restCall('worklog/list', 'POST', { ids: ids.slice(startAt, startAt + JIRA.const.WORKLOGSPERPAGE) }).done(function (l) {
        const filteredLogs = l.filter(log => {
            const logDate = new Date(log.started);
            return logDate >= startDate && (endDate ? logDate < endDate : true);
        })
        logs = logs.concat(filteredLogs);
        if (ids.length > startAt + JIRA.const.WORKLOGSPERPAGE) {
            return JIRA._listLogs(ids, logs, startAt + JIRA.const.WORKLOGSPERPAGE, deferred);
        }

        var users = _.map(_.groupBy(logs, function (log) { return log.author.accountId; }), function (grp) {
            var user = grp[0].author;
            return {
                name: user.accountId,
                displayName: user.displayName,
                email: user.accountId,
                thumbUrl: (user.avatarUrls && user.avatarUrls["48x48"]) ? user.avatarUrls["48x48"] : ''
            }
        }).sort((a, b) => a.displayName > b.displayName ? 1 : -1);

        var cleanedLogs = _.map(logs, function (log) {
            return {
                date: Utility.getDate(log.started),
                username: log.author.accountId,
                userDisplayName: log.author.displayName,
                time: log.timeSpentSeconds,
                comment: log.comment,
                created: log.created,
                issueId: log.issueId,
                id: log.id
            };
        });

        //Get JIRA Issues
        var issueIds = _.uniq(_.pluck(logs, 'issueId'));

        JIRA._getIssues(issueIds).done(function (issuesArr) {
            var issues = {};

            _.each(issuesArr, function (issue) {
                let parentKey, parentSummary, parentId;
                let status, parentStatus, project, issueType;
                if (issue.fields) {
                    if (issue.fields.parent) {
                        parentId = issue.fields.parent.id;
                        parentKey = issue.fields.parent.key;
                        parentSummary = issue.fields.parent.fields.summary;
                        parentStatus = issue.fields.parent.fields && issue.fields.parent.fields.status.name
                        if (!issues[parentId]) {
                            issues[parentId] = { key: parentKey, summary: parentSummary, project: issue.fields.parent.fields.project, issueType: issue.fields.parent.fields.issuetype }
                        }
                    }
                    if (issue.fields.status) {
                        status = issue.fields.status.name;
                    }
                    if (issue.fields.project) {
                        project = issue.fields.project;
                    }
                    if (issue.fields.issuetype) {
                        issueType = issue.fields.issuetype;
                    }
                }
                issues[issue.id] = { key: issue.key, summary: issue.fields.summary, parentKey, parentId, parentSummary, status, parentStatus, project, issueType };
            });

            deferred.resolve({ users, logs: cleanedLogs, issues });
        });
    }).fail(function (message) {
        deferred.resolve({ users: users, logs: cleanedLogs, issues: null });
    });

    return deferred.promise();
}

JIRA._getIssues = function (issueIds, issues = [], deferred = $.Deferred()) {
    var request = {
        jql: "id in (" + issueIds.join(',') + ") order by key DESC",
        maxResults: JIRA.const.MAX_SEARCH_RESULTS,
        fields: [
            "summary",
            "key",
            "parent",
            "status",
            "project",
            "issuetype"
        ],
        fieldsByKeys: false,
        startAt: issues.length
    };

    JIRA.restCall('search', 'POST', request).done(function (resp) {
        issues = issues.concat(resp.issues);

        if (issues.length >= resp.total) {
            deferred.resolve(issues);
        } else {
            JIRA._getIssues(issueIds, issues, deferred);
        }
    }).fail(function (message) {
        deferred.reject(message);
    });

    return deferred.promise();
};