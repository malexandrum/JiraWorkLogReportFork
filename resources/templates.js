function renderConfigTemplate(templateHtml, data) {
    var html = templateHtml;
    var configs = data.configs;
    
    var configItems = '';
    for (var i = 0; i < configs.length; i++) {
        var config = configs[i];
        var groupByValue = config.groupBy ? config.groupBy.replace(/"/g, '&quot;') : '';
        
        configItems += `
        <div class="mdl-card mdl-shadow--4dp list-group-item" data-id="${config.id}">
            <div class="mdl-card__supporting-text">
                <div class="mdl-textfield mdl-js-textfield">
                    <label>Name:</label>
                    <input type="text" class="config-name mdl-textfield__input" placeholder="e.g. MyTeam" value="${config.name}" />
                </div>
                <div class="mdl-textfield config-host-container mdl-js-textfield">
                    <label>Host:</label>
                    <input type="text" class="config-host mdl-textfield__input" placeholder="https://company.atlassian.net" value="${config.host}" />
                </div>
                <div class="mdl-textfield config-host-container mdl-js-textfield">
                    <label>Group By Columns JSON<br>["project","issueType","month","user"]:</label>
                    <input type="text" class="config-groupby mdl-textfield__input" placeholder="" value="${groupByValue}" />
                </div>
                <div class="config-save-alert" style="display:none"></div>
            </div>
            <div class="mdl-card__actions">
                <button class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect config-save">${config.id != 0 ? 'Update' : 'Create'}</button>
                ${config.id != 0 ? '<button class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect config-delete">Delete</button>' : ''}
            </div>
        </div>`;
    }
    
    return `<div class="list-group">${configItems}</div>`;
}

function renderReportTemplate(templateHtml, templateData) {
    var data = templateData.data;
    var users = templateData.users;
    
    if (templateHtml.includes('tmpl-logs-by-user')) {
        return renderLogsByUserTemplate(data, users);
    } else {
        return renderLogsByDateTemplate(data, users);
    }
}

function renderLogsByUserTemplate(data, users) {
    var html = `
    <table class="mdl-data-table mdl-js-data-table mdl-shadow--2dp">
        <thead>
            <colgroup>
                <col width="11%">
                <col width="7%">
                <col width="32%">
                <col width="32%">
                <col width="10%">
                <col width="8%">
            </colgroup>                
            <tr>
                <th class="mdl-data-table__cell--non-numeric" rowspan="2">Date</th>
                <th rowspan="2">Logged Time</th>
            </tr>
            <tr>
                <th class="mdl-data-table__cell--non-numeric">Parent</th>
                <th class="mdl-data-table__cell--non-numeric">Issue</th>
                <th class="mdl-data-table__cell--non-numeric">Comment</th>
                <th>Time Spent</th>
            </tr>
        </thead>
        <tbody>`;
    
    for (var i = 0; i < data.length; i++) {
        var logGroup = data[i];
        var user = users[logGroup.username] || { thumbUrl: '', displayName: logGroup.username };
        
        html += `
        <tr class="log-header-row">
            <td colspan="7" class="mdl-data-table__cell--non-numeric">
                <img class="user-img" src="${user.thumbUrl}" />
                <span class="group-title">${user.displayName}</span>
                <span>Total: ${Utility.getTimeFormatted(logGroup.totalTime)}</span>
            </td>
        </tr>`;
        
        for (var j = 0; j < logGroup.logs.length; j++) {
            var dailyLog = logGroup.logs[j];
            var numLogs = dailyLog.logs.length;
            
            html += `
            <tr>
                <td class="mdl-data-table__cell--non-numeric" rowspan="${numLogs}">${Utility.getDateFormatted(dailyLog.date, true)}</td>
                <td rowspan="${numLogs}">${Utility.getTimeFormatted(dailyLog.totalTime)}</td>
                <td class="mdl-data-table__cell--non-numeric">${Utility.getParent(dailyLog.logs[0])}</td>
                <td class="mdl-data-table__cell--non-numeric">${Utility.getIssue(dailyLog.logs[0])}</td>
                <td class="mdl-data-table__cell--non-numeric comment-col">${dailyLog.logs[0].comment || ''}</td>
                <td>${Utility.getTimeFormatted(dailyLog.logs[0].time)}</td>
            </tr>`;
            
            for (var k = 1; k < dailyLog.logs.length; k++) {
                var log = dailyLog.logs[k];
                html += `
                <tr>
                    <td class="mdl-data-table__cell--non-numeric">${Utility.getParent(log)}</td>
                    <td class="mdl-data-table__cell--non-numeric">${Utility.getIssue(log)}</td>
                    <td class="mdl-data-table__cell--non-numeric comment-col">${log.comment || ''}</td>
                    <td>${Utility.getTimeFormatted(log.time)}</td>
                </tr>`;
            }
        }
    }
    
    html += '</tbody></table>';
    return html;
}

function renderLogsByDateTemplate(data, users) {
    var html = `
    <table class="mdl-data-table mdl-js-data-table mdl-shadow--2dp">
        <thead>
            <colgroup>
                <col width="11%">
                <col width="7%">
                <col width="32%">
                <col width="32%">
                <col width="10%">
                <col width="8%">
            </colgroup>
            <tr>
                <th rowspan="2" class="mdl-data-table__cell--non-numeric">User</th>
                <th rowspan="2">Logged Time</th>
            </tr>
            <tr>
                <th class="mdl-data-table__cell--non-numeric">Parent</th>
                <th class="mdl-data-table__cell--non-numeric">Issue</th>
                <th class="mdl-data-table__cell--non-numeric">Comment</th>
                <th>Time Spent</th>
            </tr>
        </thead>
        <tbody>`;
    
    for (var i = 0; i < data.length; i++) {
        var logGroup = data[i];
        var user = users[logGroup.username] || { thumbUrl: '', displayName: logGroup.username };
        
        html += `
        <tr class="log-header-row">
            <td class="mdl-data-table__cell--non-numeric" colspan="6">
                <img class="user-img" style="float: left;" src="${user.thumbUrl}" />
                <span class="group-title" style="margin: 15px 15px 0px">${user.displayName}</span>
                <span class="group-title" style="float: right; margin-top: 15px">Total: ${Utility.getTimeFormatted(logGroup.totalTime)}</span>
            </td>
        </tr>`;
        
        for (var j = 0; j < logGroup.logs.length; j++) {
            var userLog = logGroup.logs[j];
            var numLogs = userLog.logs.length;
            
            html += `
            <tr>
                <td class="mdl-data-table__cell--non-numeric" rowspan="${numLogs}">
                    <span class="group-title">${Utility.getDateFormatted(userLog.date, true)}</span>
                </td>
                <td rowspan="${numLogs}">${Utility.getTimeFormatted(userLog.totalTime)}</td>
                <td class="mdl-data-table__cell--non-numeric">${Utility.getParent(userLog.logs[0])}</td>
                <td class="mdl-data-table__cell--non-numeric">${Utility.getIssue(userLog.logs[0])}</td>
                <td class="mdl-data-table__cell--non-numeric comment-col">${userLog.logs[0].comment || ''}</td>
                <td>${Utility.getTimeFormatted(userLog.logs[0].time)}</td>
            </tr>`;
            
            for (var k = 1; k < userLog.logs.length; k++) {
                var log = userLog.logs[k];
                html += `
                <tr>
                    <td class="mdl-data-table__cell--non-numeric">${Utility.getParent(log)}</td>
                    <td class="mdl-data-table__cell--non-numeric">${Utility.getIssue(log)}</td>
                    <td class="mdl-data-table__cell--non-numeric comment-col">${log.comment || ''}</td>
                    <td>${Utility.getTimeFormatted(log.time)}</td>
                </tr>`;
            }
        }
    }
    
    html += '</tbody></table>';
    return html;
}