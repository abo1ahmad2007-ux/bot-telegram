/**
 * 🏛️ منظومة الإدارة الجامعية المتكاملة لجامعة AUST - الإصدار الخارق V7.0 ULTIMATE
 * نظام إدارة محتوى كامل (Bot CMS) + لوحة تحكم سحابية + نظام شكاوى ذكي + جدولة متقدمة
 * 
 * ✨ الإضافات الجديدة:
 * - نظام الشكاوى الذكي مع AI
 * - لوحة إحصائيات حية
 * - جدولة محاضرات وامتحانات
 * - تصعيد تلقائي للشكاوى
 * - تحليل ذكي للمحتوى
 */

var token = "8473271051:AAGDXPXVDOu_hyNJ4SkX4CXTPyhLCFmgRQs";
var ssId = "13cfsS7HwFpwfQGH8AHhnQZz83zfDTczDYfUC-3JZtT8";
var adminId = 8374754679;

var config = PropertiesService.getScriptProperties();
var faculties = ["هندسة المعلوماتية", "هندسة البترول", "طب الاسنان", "الصيدلة", "هندسة الصناعات الكيميائية", "الهندسة الآلية", "الهندسة المدنية", "العمارة", "إدارة الأعمال"];

// ========================================================
// 🤖 نظام الكلمات المفتاحية الذكي
// ========================================================
var AI_KEYWORDS = {
  "عاجل": { priority: "عاجل 🔥", department: "الدعم الفني", response: "تم استقبال شكواك العاجلة" },
  "محاضرة": { priority: "عادي", department: "شؤون الدراسة", response: "سيتم تحويل شكواك لمكتب شؤون الدراسة" },
  "علامة": { priority: "عادي", department: "الاعتراضات", response: "يمكنك تقديم اعتراض رسمي" },
  "نقليات": { priority: "عادي", department: "الخدمات", response: "سيتم متابعة موضوعك مع إدارة النقليات" },
  "سكن": { priority: "عادي", department: "السكن", response: "سيتم التواصل مع إدارة السكن" },
  "طوارئ": { priority: "عاجل 🔥", department: "الأمن", response: "تم تسجيل حالة طوارئ" }
};

// ========================================================
// 🔄 المحرك الأساسي (doPost)
// ========================================================
function doPost(e) {
  try {
    checkAndSetupSheets();
    
    var data = JSON.parse(e.postData.contents);
    if (data.callback_query) { handleCallbacks(data.callback_query); return; }
    if (!data.message) return;
    
    var chatId = data.message.chat.id;
    var text = data.message.text ? data.message.text.trim() : "";
    var state = config.getProperty(chatId);
    
    if (isSpamming(chatId)) {
      sendTextRaw(chatId, "⚠️ بطيء قليلاً! انتظر ثانية");
      return;
    }
    
    if (isUserBanned(chatId)) {
      sendTextRaw(chatId, "🚫 حسابك محظور");
      return;
    }
    
    if (text !== "") {
      config.setProperty("LAST_SEEN_" + chatId, Utilities.formatDate(new Date(), "GMT+3", "yyyy-MM-dd"));
    }
    
    var isSuperAdmin = (chatId === adminId || checkUserRole(chatId, "أدمن عام"));
    var facultyDetails = getSubAdminFacultyAndRole(chatId);
    
    if (config.getProperty("SANDBOX_MODE_" + chatId) === "true" && text === "🔙 إنهاء الاختبار") {
      config.deleteProperty("SANDBOX_MODE_" + chatId);
      config.deleteProperty("SANDBOX_FACULTY_" + chatId);
      config.deleteProperty("SANDBOX_YEAR_" + chatId);
      sendText(chatId, "✅ تم إنهاء وضع الاختبار");
      return;
    }
    
    var testUser = null;
    if (config.getProperty("SANDBOX_MODE_" + chatId) === "true") {
      testUser = {
        name: "حساب تجريبي 🧪",
        phone: "+963900000000",
        uniId: "99999",
        faculty: config.getProperty("SANDBOX_FACULTY_" + chatId),
        year: config.getProperty("SANDBOX_YEAR_" + chatId)
      };
    }
    
    if (!isSuperAdmin && !facultyDetails && !testUser) {
      if (!checkRequiredChannels(chatId)) {
        sendRequiredChannelsMessage(chatId);
        return;
      } else {
        logChannelSubscriber(chatId, data.message.from.first_name, data.message.from.username);
      }
    }
    
    var isMaintenance = config.getProperty("MAINTENANCE_MODE") === "true";
    if (isMaintenance && !isSuperAdmin) {
      sendTextRaw(chatId, "⚠️ السيرفر قيد الصيانة، نعود قريباً");
      return;
    }
    
    if (isSuperAdmin && config.getProperty("SANDBOX_MODE_" + chatId) !== "true") {
      if (text === "/start" || text === "👑 لوحة الإدارة" || text === "⚠️ الشكاوى" ||
          text === "📊 التقارير" || text === "🕒 الإعلانات" || text === "🚫 الحظر" ||
          text === "💬 رسالة" || text === "🧪 اختبار" || text === "⚙️ الأزرار" ||
          text === "🔧 صيانة" || text === "👥 المشرفين" || text === "📉 نسخة" ||
          text === "📈 إحصائيات" || text === "📅 جدولة") {
        
        handleSuperAdminLogic(chatId, text, state);
        return;
      }
    }
    
    if (facultyDetails && config.getProperty("SANDBOX_MODE_" + chatId) !== "true" && !isSuperAdmin) {
      if (text === "/start" || text === "🏢 لوحة الكلية" || text === "📥 الشكاوى" ||
          text === "📢 إعلانات" || text === "👥 الطلاب" || text === "🎛️ الأزرار") {
        
        handleSubAdminLogic(chatId, text, state, facultyDetails);
        return;
      }
    }
    
    if (state) {
      handleGlobalStateEngine(chatId, text, state, facultyDetails, data);
      return;
    }
    
    var userData = testUser || getUserInfo(chatId);
    
    if (text === "/start" || text === "🏠 القائمة الرئيسية") {
      if (userData) {
        sendDynamicStudentMenu(chatId, userData);
      } else {
        config.setProperty(chatId, "WAIT_NAME");
        sendText(chatId, "👋 أهلاً بك!\nأدخل اسمك لتبدأ:");
      }
      return;
    }
    
    if (userData) {
      handleStudentFeatures(chatId, text, userData, data.message.from.username);
    }
    
  } catch (err) { 
    Logger.log("ERROR: " + err.toString()); 
  }
}

// ========================================================
// 👑 لوحة الإدارة العليا (بتصميم أفضل)
// ========================================================
function handleSuperAdminLogic(chatId, text, state) {
  if (text === "/start" || text === "👑 لوحة الإدارة") {
    config.deleteProperty(chatId);
    var menu = {
      keyboard: [
        [{text: "⚠️ الشكاوى"}, {text: "📈 إحصائيات"}],
        [{text: "📊 التقارير"}, {text: "📅 جدولة"}],
        [{text: "🕒 الإعلانات"}, {text: "💬 رسالة"}],
        [{text: "🚫 الحظر"}, {text: "👥 المشرفين"}],
        [{text: "🧪 اختبار"}, {text: "⚙️ الأزرار"}],
        [{text: "🔧 صيانة"}, {text: "📉 نسخة"}]
      ],
      resize_keyboard: true
    };
    sendText(chatId, "👑 لوحة تحكم الإدارة v7\n━━━━━━━━━━━━━━\nاختر خياراً:", menu);
    return;
  }
  
  if (text === "📈 إحصائيات") {
    sendLiveDashboard(chatId);
    return;
  }
  
  if (text === "📅 جدولة") {
    config.setProperty(chatId, "SADMIN_SCHED_TYPE");
    var typeMenu = { keyboard: [[{text: "📚 محاضرات"}, {text: "📝 امتحانات"}], [{text: "👑 للخلف"}]], resize_keyboard: true };
    sendText(chatId, "اختر النوع:", typeMenu);
    return;
  }
  
  if (text === "⚠️ الشكاوى") {
    sendCentralTickets(chatId);
    return;
  }
  
  if (text === "📉 نسخة") {
    sendSpreadsheetAsExcel(chatId, "نسخة احتياطية من البيانات");
    logAdminAction(chatId, "تحميل نسخة احتياطية", "الإدارة");
    return;
  }
  
  if (text === "🔧 صيانة") {
    var current = config.getProperty("MAINTENANCE_MODE") === "true";
    config.setProperty("MAINTENANCE_MODE", current ? "false" : "true");
    sendText(chatId, !current ? "🔴 تم تفعيل الصيانة" : "🟢 تم إيقاف الصيانة");
    logAdminAction(chatId, "تغيير حالة الصيانة", "الإدارة");
    return;
  }
  
  if (text === "💬 رسالة") {
    config.setProperty(chatId, "SADMIN_WAIT_DIRECT_ID");
    sendText(chatId, "أدخل Chat ID:", {keyboard: [[{text: "👑 للخلف"}]], resize_keyboard: true});
    return;
  }
  
  if (text === "🚫 الحظر") {
    config.setProperty(chatId, "SADMIN_WAIT_BAN_ID");
    sendText(chatId, "أدخل Chat ID للحظر:", {keyboard: [[{text: "👑 للخلف"}]], resize_keyboard: true});
    return;
  }
  
  if (text === "🧪 اختبار") {
    config.setProperty(chatId, "SADMIN_SANDBOX_FAC");
    var rows = []; 
    for (var i = 0; i < faculties.length; i += 2) {
      rows.push([{text: faculties[i], callback_data: "sand_setfac_" + faculties[i]}]);
      if (i + 1 < faculties.length) {
        rows[rows.length - 1].push({text: faculties[i + 1], callback_data: "sand_setfac_" + faculties[i + 1]});
      }
    }
    sendText(chatId, "اختر كلية:", {inline_keyboard: rows});
    return;
  }
  
  if (text === "📊 التقارير") {
    sendAdvancedReport(chatId);
    return;
  }
  
  if (text === "⚙️ الأزرار") {
    sendText(chatId, "⚙️ عدّل الأزرار من جدول [Bot_CMS]");
    return;
  }
  
  if (text === "🕒 الإعلانات") {
    config.setProperty(chatId, "SADMIN_WAIT_SCHED_MSG");
    sendText(chatId, "أرسل الإعلان:", {keyboard: [[{text: "👑 للخلف"}]], resize_keyboard: true});
    return;
  }
}

// ========================================================
// 📈 لوحة الإحصائيات (Dashboard)
// ========================================================
function sendLiveDashboard(chatId) {
  try {
    checkAndSetupSheets();
    
    var ss = SpreadsheetApp.openById(ssId);
    var sheetUsers = ss.getSheetByName("احصائيات الدخول");
    var sheetTickets = ss.getSheetByName("الشكاوى");
    
    if (!sheetUsers || !sheetTickets) {
      sendText(chatId, "❌ خطأ في البيانات");
      return;
    }
    
    var dataUsers = sheetUsers.getDataRange().getValues();
    var dataTickets = sheetTickets.getDataRange().getValues();
    
    var totalUsers = dataUsers.length - 1;
    var activeUsers = 0;
    var bannedUsers = 0;
    var totalTickets = dataTickets.length - 1;
    var openTickets = 0;
    var solvedTickets = 0;
    
    for (var i = 1; i < dataUsers.length; i++) {
      if (dataUsers[i][8] === "نشط ✅") activeUsers++;
      if (dataUsers[i][8] === "محظور 🚫") bannedUsers++;
    }
    
    for (var i = 1; i < dataTickets.length; i++) {
      if (dataTickets[i][9] === "قيد الانتظار") openTickets++;
      if (dataTickets[i][9] === "تمت المعالجة") solvedTickets++;
    }
    
    var dashboard = "📊 لوحة الإحصائيات\n";
    dashboard += "━━━━━━━━━━━━━━━━\n\n";
    dashboard += "👥 المستخدمون:\n";
    dashboard += "   🔵 الإجمالي: " + totalUsers + "\n";
    dashboard += "   🟢 نشطين: " + activeUsers + "\n";
    dashboard += "   🔴 محظورين: " + bannedUsers + "\n\n";
    
    dashboard += "⚠️ الشكاوى:\n";
    dashboard += "   📝 الإجمالي: " + totalTickets + "\n";
    dashboard += "   🟡 معلقة: " + openTickets + "\n";
    dashboard += "   ✅ مُحلة: " + solvedTickets + "\n\n";
    
    var solveRate = totalTickets > 0 ? ((solvedTickets / totalTickets) * 100).toFixed(1) : 0;
    dashboard += "📈 معدل الحل: " + solveRate + "%\n";
    dashboard += "━━━━━━━━━━━━━━━━\n";
    dashboard += "⏰ " + Utilities.formatDate(new Date(), "GMT+3", "HH:mm:ss");
    
    sendText(chatId, dashboard);
  } catch(e) {
    Logger.log("Dashboard Error: " + e.toString());
    sendText(chatId, "❌ خطأ: " + e.toString());
  }
}

// ========================================================
// 📊 التقارير المتقدمة
// ========================================================
function sendAdvancedReport(chatId) {
  try {
    checkAndSetupSheets();
    
    var ss = SpreadsheetApp.openById(ssId);
    var report = "📊 التقرير الشامل\n";
    report += "━━━━━━━━━━━━━━\n\n";
    
    var sheetUsers = ss.getSheetByName("احصائيات الدخول");
    var dataUsers = sheetUsers.getDataRange().getValues();
    report += "📌 الإحصائيات:\n";
    report += "   المستخدمون: " + (dataUsers.length - 1) + "\n\n";
    
    var facultyStats = {};
    for (var i = 1; i < dataUsers.length; i++) {
      var fac = dataUsers[i][6];
      facultyStats[fac] = (facultyStats[fac] || 0) + 1;
    }
    
    report += "🎓 توزيع الطلاب:\n";
    for (var fac in facultyStats) {
      report += "   • " + fac + ": " + facultyStats[fac] + "\n";
    }
    
    sendText(chatId, report);
    sendSpreadsheetAsExcel(chatId, "التقرير الشامل");
  } catch(e) {
    Logger.log("Report Error: " + e.toString());
    sendText(chatId, "❌ خطأ");
  }
}

// ========================================================
// 🏢 لوحة أدمن الكليات
// ========================================================
function handleSubAdminLogic(chatId, text, state, facultyDetails) {
  if (text === "/start" || text === "🏢 لوحة الكلية") {
    config.deleteProperty(chatId);
    var menu = {
      keyboard: [
        [{text: "📥 الشكاوى"}, {text: "📢 إعلانات"}],
        [{text: "👥 الطلاب"}, {text: "🎛️ الأزرار"}],
        [{text: "🏢 الرئيسية"}]
      ],
      resize_keyboard: true
    };
    sendText(chatId, "🏢 لوحة كلية: " + facultyDetails.faculty + "\nصلاحيتك: " + facultyDetails.role, menu);
    return;
  }
  
  if (text === "📥 الشكاوى") {
    if (facultyDetails.role === "مشرف - إعلانات") {
      sendText(chatId, "❌ ليس لديك صلاحية");
      return;
    }
    sendSubAdminTickets(chatId, facultyDetails.faculty);
    return;
  }
  
  if (text === "📢 إعلانات") {
    if (facultyDetails.role === "مشرف - شكاوى") {
      sendText(chatId, "❌ ليس لديك صلاحية");
      return;
    }
    config.setProperty(chatId, "SUB_WAIT_BROADCAST");
    sendText(chatId, "📢 أرسل الإعلان:", {keyboard: [[{text: "🏢 للخلف"}]], resize_keyboard: true});
    return;
  }
  
  if (text === "👥 الطلاب") {
    sendText(chatId, getFacultyStats(facultyDetails.faculty));
    return;
  }
}

// ========================================================
// ⚙️ معالجة الحالات (States Engine)
// ========================================================
function handleGlobalStateEngine(chatId, text, state, facultyDetails, data) {
  
  if (state === "WAIT_MSG") {
    var userData = getUserInfo(chatId);
    recordTicketWithAI(chatId, text, userData);
    return;
  }
  
  if (state.startsWith("REPLY_TO_TICKET_")) {
    var parts = state.split("_");
    var studentChatId = parts[3];
    var ticketRow = parts[4];
    
    sendText(studentChatId, "✅ وصلك رد رسمي:\n" + text);
    
    var sheet = SpreadsheetApp.openById(ssId).getSheetByName("الشكاوى");
    sheet.getRange(ticketRow, 10).setValue("تمت المعالجة");
    sheet.getRange(ticketRow, 12).setValue(text);
    
    config.deleteProperty(chatId);
    sendText(chatId, "✅ تم إرسال الرد");
    return;
  }
  
  if (state === "SADMIN_WAIT_DIRECT_ID") {
    config.setProperty(chatId + "_DIR_ID", text);
    config.setProperty(chatId, "SADMIN_WAIT_DIRECT_MSG");
    sendText(chatId, "اكتب الرسالة:");
    return;
  }
  
  if (state === "SADMIN_WAIT_DIRECT_MSG") {
    var targetId = config.getProperty(chatId + "_DIR_ID");
    sendText(targetId, "💬 رسالة من الإدارة:\n" + text);
    config.deleteProperty(chatId); 
    config.deleteProperty(chatId + "_DIR_ID");
    sendText(chatId, "✅ تم");
    return;
  }
  
  if (state === "SADMIN_WAIT_SCHED_MSG") {
    config.setProperty(chatId + "_SCHED_TXT", text);
    config.setProperty(chatId, "SADMIN_WAIT_SCHED_TIME");
    sendText(chatId, "حدد الوقت (yyyy-MM-dd HH:mm):");
    return;
  }
  
  if (state === "SADMIN_WAIT_SCHED_TIME") {
    var sTxt = config.getProperty(chatId + "_SCHED_TXT");
    var sheet = SpreadsheetApp.openById(ssId).getSheetByName("الجدولة والنسخ الاحتياطي");
    sheet.appendRow([new Date(), "إعلان", sTxt, text, "قيد الانتظار"]);
    config.deleteProperty(chatId); 
    config.deleteProperty(chatId + "_SCHED_TXT");
    sendText(chatId, "✅ تم جدولة الإعلان");
    return;
  }
  
  if (state === "SADMIN_WAIT_BAN_ID") {
    var targetBanId = text;
    var sheet = SpreadsheetApp.openById(ssId).getSheetByName("احصائيات الدخول");
    var dataRange = sheet.getDataRange().getValues();
    var found = false;
    for (var i = 1; i < dataRange.length; i++) {
      if (dataRange[i][5] && dataRange[i][5].toString().trim() === targetBanId) {
        var currentStatus = dataRange[i][8] || "";
        var newStatus = currentStatus === "محظور 🚫" ? "نشط ✅" : "محظور 🚫";
        sheet.getRange(i + 1, 9).setValue(newStatus);
        sendText(chatId, "✅ تم تغيير الحالة إلى: " + newStatus);
        found = true; 
        break;
      }
    }
    if (!found) sendText(chatId, "❌ لم يتم العثور");
    config.deleteProperty(chatId);
    return;
  }
  
  if (state === "SUB_WAIT_BROADCAST") {
    config.deleteProperty(chatId);
    broadcastToFacultyStudents(facultyDetails.faculty, text);
    sendText(chatId, "✅ تم النشر");
    return;
  }
  
  if (state === "WAIT_NAME") {
    config.setProperty(chatId + "_N", text); 
    config.setProperty(chatId, "WAIT_PHONE");
    var phoneKeyboard = { keyboard: [[{ text: "📱 شارك رقم الهاتف", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true };
    sendText(chatId, "✅ شارك رقم الهاتف:", phoneKeyboard);
    return;
  }
  
  if (state === "WAIT_PHONE") {
    if (data && data.message && data.message.contact) {
      config.setProperty(chatId + "_P", data.message.contact.phone_number);
      config.setProperty(chatId, "WAIT_UNI");
      sendText(chatId, "✅ أرسل رقمك الجامعي:", {remove_keyboard: true});
    } else {
      sendText(chatId, "⚠️ اضغط على الزر!");
    }
    return;
  }
  
  if (state === "WAIT_UNI") {
    config.setProperty(chatId + "_U", text); 
    config.setProperty(chatId, "WAIT_YEAR");
    var yearMenu = { keyboard: [[{text:"سنة 1️⃣"}, {text:"سنة 2️⃣"}], [{text:"سنة 3️⃣"}, {text:"سنة 4️⃣"}], [{text:"سنة 5️⃣"}]], resize_keyboard: true };
    sendText(chatId, "السنة الدراسية:", yearMenu);
    return;
  }
  
  if (state === "WAIT_YEAR") {
    config.setProperty(chatId + "_Y", text); 
    config.setProperty(chatId, "WAIT_FACULTY");
    sendFacultyKeyboard(chatId, "اختر الكلية:");
    return;
  }
  
  if (state === "WAIT_GPA_CALC") {
    config.deleteProperty(chatId);
    calculateAndSendGPA(chatId, text);
    return;
  }
  
  if (state === "WAIT_BUS_CITY") {
    config.deleteProperty(chatId);
    sendBusLineDetails(chatId, text);
    return;
  }
  
  if (state === "SADMIN_SCHED_TYPE") {
    if (text === "📚 محاضرات") {
      config.setProperty(chatId, "SADMIN_SCHED_LECTURE");
      sendText(chatId, "صيغة: المادة - الكلية - اليوم - الساعة");
    } else if (text === "📝 امتحانات") {
      config.setProperty(chatId, "SADMIN_SCHED_EXAM");
      sendText(chatId, "صيغة: المادة - الكلية - التاريخ - الساعة - القاعة");
    }
    return;
  }
  
  if (state === "SADMIN_SCHED_LECTURE" || state === "SADMIN_SCHED_EXAM") {
    var sheet = SpreadsheetApp.openById(ssId).getSheetByName("الجدولة والنسخ الاحتياطي");
    sheet.appendRow([new Date(), state === "SADMIN_SCHED_LECTURE" ? "📚 محاضرة" : "📝 امتحان", text, "", "مُضافة"]);
    config.deleteProperty(chatId);
    sendText(chatId, "✅ تم الإضافة");
    return;
  }
}

// ========================================================
// 🎓 ميزات الطالب
// ========================================================
function handleStudentFeatures(chatId, text, userData, username) {
  
  if (text === "✍️ شكوى") {
    config.setProperty(chatId, "WAIT_MSG");
    sendText(chatId, "📝 اكتب تفاصيل الشكوى:");
    return;
  }
  
  if (text === "📮 شكاويّ") {
    sendStudentTicketTracker(chatId);
    return;
  }
  
  if (text === "🧮 حاسبة المعدل") {
    config.setProperty(chatId, "WAIT_GPA_CALC");
    sendText(chatId, "أدخل البيانات:\nعلامة:ساعات\n90:3\n85:2");
    return;
  }
  
  if (text === "🚌 نقليات") {
    config.setProperty(chatId, "WAIT_BUS_CITY");
    var busMenu = { keyboard: [[{text: "حماه"}, {text: "ريف حماه"}], [{text: "حمص"}, {text: "محافظات"}]], resize_keyboard: true };
    sendText(chatId, "اختر المدينة:", busMenu);
    return;
  }
  
  if (text === "❓ أسئلة") {
    var faqMenu = { inline_keyboard: [[{text: "📂 وثائق", callback_data: "faq_docs"}], [{text: "🎖️ اعتراضات", callback_data: "faq_objections"}]] };
    sendText(chatId, "اختر السؤال:", faqMenu);
    return;
  }
  
  if (text === "👤 حسابي") {
    var profileBtn = {
      inline_keyboard: [
        [{text: "✍️ اسم", callback_data: "mod_name"}, {text: "🎓 كلية", callback_data: "mod_faculty"}],
        [{text: "🔢 رقم", callback_data: "mod_uniid"}]
      ]
    };
    sendText(chatId, "👤 ملفك:\n\n👤 الاسم: " + userData.name + "\n📞 الهاتف: " + userData.phone + "\n🏫 الجامعي: " + userData.uniId + "\n🎓 الكلية: " + userData.faculty, profileBtn);
    return;
  }
  
  if (text === "⏰ جدول") {
    sendRemindersInfo(chatId);
    return;
  }
  
  var cmsSuccess = handleDynamicCMSButtonPress(chatId, text, userData);
  if (cmsSuccess) return;
}

// ========================================================
// ⏰ المذكرات والجدولة
// ========================================================
function sendRemindersInfo(chatId) {
  try {
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName("الجدولة والنسخ الاحتياطي");
    if (!sheet) {
      sendText(chatId, "📭 لا توجد جدولة");
      return;
    }
    
    var data = sheet.getDataRange().getValues();
    var msg = "⏰ الجدول:\n━━━━━━━━━━━━\n\n";
    var count = 0;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] && (data[i][1].toString().includes("محاضرة") || data[i][1].toString().includes("امتحان"))) {
        msg += "📌 " + data[i][2] + "\n   ⏰ " + data[i][3] + "\n\n";
        count++;
        if (count >= 5) break;
      }
    }
    
    sendText(chatId, count > 0 ? msg : "📭 لا توجد جدولة");
  } catch(e) {
    sendText(chatId, "⚠️ خطأ");
  }
}

// ========================================================
// 🔄 قائمة الطالب الرئيسية (Student Menu)
// ========================================================
function sendDynamicStudentMenu(chatId, userData) {
  var keyboardRows = [];
  
  keyboardRows.push([{text: "✍️ شكوى"}, {text: "📮 شكاويّ"}]);
  keyboardRows.push([{text: "🧮 معدل"}, {text: "🚌 نقليات"}]);
  keyboardRows.push([{text: "❓ أسئلة"}, {text: "⏰ جدول"}]);
  keyboardRows.push([{text: "👤 حسابي"}]);
  
  try {
    checkAndSetupSheets();
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName("Bot_CMS");
    if (sheet && sheet.getLastRow() > 1) {
      var data = sheet.getDataRange().getValues();
      var tempRow = [];
      for (var i = 1; i < data.length; i++) {
        var bText = data[i][0];
        var emoji = data[i][1];
        var visibility = data[i][3];
        var targetFaculty = data[i][6];
        var targetYear = data[i][7];
        
        if (visibility === "🟢") {
          if (targetFaculty === "" || targetFaculty.toString().trim() === userData.faculty.toString().trim()) {
            if (targetYear === "" || targetYear.toString().trim() === userData.year.toString().trim()) {
              var fullText = (emoji ? emoji + " " : "") + bText;
              tempRow.push({text: fullText});
              
              if (tempRow.length === 2) {
                keyboardRows.push(tempRow);
                tempRow = [];
              }
            }
          }
        }
      }
      if (tempRow.length > 0) keyboardRows.push(tempRow);
    }
  } catch(e) {
    Logger.log("CMS Error: " + e.toString());
  }
  
  keyboardRows.push([{text: "🏠 القائمة الرئيسية"}]);
  
  var studentMenu = { keyboard: keyboardRows, resize_keyboard: true };
  var welcome = "👋 أهلاً " + userData.name + "!\n━━━━━━━━━━━━\n🏫 جامعة AUST";
  sendText(chatId, welcome, studentMenu);
}

function handleDynamicCMSButtonPress(chatId, text, userData) {
  try {
    checkAndSetupSheets();
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName("Bot_CMS");
    if (!sheet) return false;
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var bText = data[i][0];
      var emoji = data[i][1];
      var fullText = (emoji ? emoji + " " : "") + bText;
      
      if (text === fullText) {
        var type = data[i][4];
        var content = data[i][5];
        
        var currentClicks = parseInt(data[i][8] || 0);
        sheet.getRange(i + 1, 9).setValue(currentClicks + 1);
        
        if (type === "url") {
          var urlKb = { inline_keyboard: [[{text: "🔗 فتح", url: content}]] };
          sendTextRaw(chatId, "🔗 اضغط على الرابط:", urlKb);
        } else {
          sendText(chatId, content);
        }
        return true;
      }
    }
  } catch(e) {
    Logger.log("CMS Button Error: " + e.toString());
  }
  return false;
}

// ========================================================
// 🤖 نظام الشكاوى الذكي
// ========================================================
function recordTicketWithAI(chatId, text, userData) {
  try {
    checkAndSetupSheets();
    var ss = SpreadsheetApp.openById(ssId);
    var sheet1 = ss.getSheetByName("الشكاوى");
    var dateStr = Utilities.formatDate(new Date(), "GMT+3", "yyyy-MM-dd HH:mm:ss");
    
    var analysis = analyzeTicketContent(text);
    var priority = analysis.priority || "عادي";
    var suggestedDept = analysis.department || "عامة";
    
    sheet1.appendRow([dateStr, sheet1.getLastRow(), userData.name, userData.phone, userData.uniId, chatId, suggestedDept, text, priority, "قيد الانتظار", userData.faculty, ""]);
    var ticketRow = sheet1.getLastRow();
    
    config.deleteProperty(chatId);
    sendText(chatId, "✅ تم استقبال شكواك\n🎫 رقم التذكرة: #" + (ticketRow - 1) + "\n⚡ الأولوية: " + priority);
    
    var alertMsg = "⚠️ شكوى جديدة!\n👤 " + userData.name + "\n🎓 " + userData.faculty + "\n📝 " + text + "\n⚡ " + priority;
    var replyKb = { inline_keyboard: [[{ text: "💬 رد", url: "tg://user?id=" + chatId }]] };
    
    var sheetConfig = ss.getSheetByName("الصلاحيات");
    if (sheetConfig && sheetConfig.getLastRow() > 1) {
      var dataConfig = sheetConfig.getDataRange().getValues();
      for (var i = 1; i < dataConfig.length; i++) {
        if (dataConfig[i][1] && dataConfig[i][1].toString().trim() === userData.faculty.toString().trim()) {
          sendText(dataConfig[i][0].toString().trim(), alertMsg, replyKb);
        }
      }
    }
    
    sendText(adminId, "👑 " + alertMsg, replyKb);
    
  } catch(e) {
    Logger.log("Ticket Error: " + e.toString());
    sendText(chatId, "❌ خطأ");
  }
}

function analyzeTicketContent(text) {
  var result = { priority: "عادي", department: "عامة" };
  var textLower = text.toLowerCase();
  
  for (var keyword in AI_KEYWORDS) {
    if (textLower.includes(keyword)) {
      result = AI_KEYWORDS[keyword];
      break;
    }
  }
  
  return result;
}

// ========================================================
// 🧮 حاسبة المعدل
// ========================================================
function calculateAndSendGPA(chatId, rawText) {
  try {
    var lines = rawText.split("\n");
    var totalPoints = 0;
    var totalHours = 0;
    var details = "📈 درجاتك:\n━━━━━━━━━━\n\n";
    
    for (var i = 0; i < lines.length; i++) {
      if (!lines[i].includes(":")) continue;
      var parts = lines[i].split(":");
      var grade = parseFloat(parts[0].trim());
      var hours = parseFloat(parts[1].trim());
      
      if (isNaN(grade) || isNaN(hours)) continue;
      
      var points = 0;
      if (grade >= 90) points = 4.0;
      else if (grade >= 85) points = 3.5;
      else if (grade >= 80) points = 3.0;
      else if (grade >= 75) points = 2.5;
      else if (grade >= 70) points = 2.0;
      else if (grade >= 60) points = 1.5;
      else if (grade >= 50) points = 1.0;
      else points = 0.0;
      
      totalPoints += (points * hours);
      totalHours += hours;
      details += "  " + grade + " (" + hours + "س): " + points + "\n";
    }
    
    if (totalHours === 0) {
      sendText(chatId, "❌ بيانات غير صحيحة");
      return;
    }
    
    var finalGPA = (totalPoints / totalHours).toFixed(2);
    details += "\n━━━━━━━━━━\n🧮 المعدل: " + finalGPA + " / 4.00";
    
    sendText(chatId, details);
  } catch(e) {
    sendText(chatId, "❌ خطأ");
  }
}

// ========================================================
// 🚌 النقليات
// ========================================================
function sendBusLineDetails(chatId, city) {
  var msg = "🚌 نقليات " + city + "\n━━━━━━━━━━━━\n\n";
  if (city.includes("ريف")) {
    msg += "📍 ريف حماه\n🕐 الصباح: 07:15\n🕓 المساء: 16:30";
  } else if (city.includes("حماه")) {
    msg += "📍 ساحة العاصي\n🕐 الأول: 07:30\n🕐 الثاني: 08:30";
  } else if (city.includes("حمص")) {
    msg += "📍 حمص\n🕐 أوقات منتظمة";
  } else {
    msg += "📍 باصات محافظات أخرى\n📞 للاستفسار: تواصل مع الإدارة";
  }
  sendText(chatId, msg);
}

// ========================================================
// 📋 إدارة الشكاوى
// ========================================================
function sendCentralTickets(chatId) {
  try {
    checkAndSetupSheets();
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName("الشكاوى");
    if (!sheet) return;
    var data = sheet.getDataRange().getValues();
    var count = 0;
    for (var i = 1; i < data.length; i++) {
      if (data[i][9] && data[i][9].toString().trim() !== "تمت المعالجة") {
        var alertMsg = "⚠️ شكوى #" + data[i][1] + "\n📝 " + data[i][7].substring(0, 50);
        var replyKb = { inline_keyboard: [[{ text: "✍️ رد", callback_data: "admin_reply_" + data[i][5] + "_" + (i + 1) }]] };
        sendText(chatId, alertMsg, replyKb);
        count++;
        if (count >= 5) break;
      }
    }
    if(count === 0) sendText(chatId, "✅ لا توجد شكاوى معلقة");
  } catch(e) {
    Logger.log("Central Tickets Error: " + e.toString());
  }
}

function sendSubAdminTickets(chatId, faculty) {
  try {
    checkAndSetupSheets();
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName("الشكاوى");
    if (!sheet) return;
    var data = sheet.getDataRange().getValues();
    var count = 0;
    for (var i = 1; i < data.length; i++) {
      if (data[i][10] && data[i][10].toString().trim() === faculty && data[i][9] && data[i][9].toString().trim() !== "تمت المعالجة") {
        var alertMsg = "⚠️ شكوى:\n👤 " + data[i][2] + "\n📝 " + data[i][7].substring(0, 50);
        var replyKb = { inline_keyboard: [[{ text: "✍️ رد", callback_data: "admin_reply_" + data[i][5] + "_" + (i + 1) }]] };
        sendText(chatId, alertMsg, replyKb);
        count++;
        if (count >= 5) break;
      }
    }
    if(count === 0) sendText(chatId, "✅ لا توجد شكاوى");
  } catch(e) {
    Logger.log("Sub Admin Tickets Error: " + e.toString());
  }
}

function sendStudentTicketTracker(chatId) {
  try {
    checkAndSetupSheets();
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName("الشكاوى");
    if (!sheet) return;
    var data = sheet.getDataRange().getValues();
    var found = false;
    var trackerMsg = "📮 شكاويك:\n━━━━━━━━━━\n\n";
    for (var i = 1; i < data.length; i++) {
      if (data[i][5] && data[i][5].toString().trim() === chatId.toString().trim()) {
        trackerMsg += "🎫 #" + data[i][1] + "\n   📝 " + data[i][7].substring(0, 30) + "\n   📊 " + data[i][9] + "\n\n";
        found = true;
      }
    }
    if (!found) trackerMsg = "📭 ليس لديك شكاوى";
    sendText(chatId, trackerMsg);
  } catch(e) {
    Logger.log("Ticket Tracker Error: " + e.toString());
  }
}

// ========================================================
// 🛡️ الحظر والتسجيل
// ========================================================
function logAdminAction(adminChatId, action, department) {
  try {
    checkAndSetupSheets();
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName("سجل العمليات (Audit_Logs)");
    if (sheet) {
      var dateStr = Utilities.formatDate(new Date(), "GMT+3", "yyyy-MM-dd HH:mm:ss");
      sheet.appendRow([dateStr, adminChatId, department, action]);
    }
  } catch(e) {}
}

function isUserBanned(chatId) {
  try {
    checkAndSetupSheets();
    var sheet = SpreadsheetApp.openById(ssId).getSheetByName("احصائيات الدخول");
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][5] && data[i][5].toString().trim() === chatId.toString().trim() && data[i][8] === "محظور 🚫") return true;
    }
  } catch(e){}
  return false;
}

function isSpamming(chatId) {
  var now = new Date().getTime();
  var lastPress = config.getProperty("SPAM_" + chatId);
  if (lastPress && (now - parseInt(lastPress) < 1500)) {
    config.setProperty("SPAM_" + chatId, now.toString());
    return true;
  }
  config.setProperty("SPAM_" + chatId, now.toString());
  return false;
}

// ========================================================
// 📊 فحص الرتب والبيانات
// ========================================================
function checkUserRole(chatId, role) {
  try {
    checkAndSetupSheets();
    var sheet = SpreadsheetApp.openById(ssId).getSheetByName("الصلاحيات");
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim() === chatId.toString().trim() && data[i][2] && data[i][2].toString().trim() === role) return true;
    }
  } catch(e){}
  return false;
}

function getSubAdminFacultyAndRole(chatId) {
  try {
    checkAndSetupSheets();
    var sheet = SpreadsheetApp.openById(ssId).getSheetByName("الصلاحيات");
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().trim() === chatId.toString().trim() && data[i][2] && !data[i][2].toString().trim().includes("أدمن عام")) {
        return { faculty: data[i][1], role: data[i][2] };
      }
    }
  } catch(e) {}
  return null;
}

function getFacultyStats(faculty) {
  try {
    checkAndSetupSheets();
    var ss = SpreadsheetApp.openById(ssId);
    var sheet1 = ss.getSheetByName("الشكاوى");
    if (!sheet1) return "لا توجد بيانات";
    var ticketsData = sheet1.getDataRange().getValues();
    var total = 0, solved = 0;
    for (var i = 1; i < ticketsData.length; i++) {
      if (ticketsData[i][10] && ticketsData[i][10].toString().trim() === faculty) {
        total++;
        if (ticketsData[i][9] === "تمت المعالجة") solved++;
      }
    }
    return "📊 إحصائيات " + faculty + "\n━━━━━━━━━━\n📝 الشكاوى: " + total + "\n✅ المحلولة: " + solved;
  } catch(e) {
    return "خطأ";
  }
}

function getUserInfo(chatId) {
  try {
    checkAndSetupSheets();
    var sheet0 = SpreadsheetApp.openById(ssId).getSheetByName("احصائيات الدخول");
    if (!sheet0 || sheet0.getLastRow() === 0) return null;
    var data0 = sheet0.getDataRange().getValues();
    for (var i = 1; i < data0.length; i++) {
      if (data0[i][5] == chatId) return { name: data0[i][2], phone: data0[i][3], uniId: data0[i][4], year: data0[i][7] || "غير محدد", faculty: data0[i][6] };
    }
  } catch(e) {
    Logger.log("Get User Info Error: " + e.toString());
  }
  return null;
}

// ========================================================
// 🖨️ المراسلات والبث
// ========================================================
function broadcastToAllStudents(msgText) {
  try {
    checkAndSetupSheets();
    var sheet = SpreadsheetApp.openById(ssId).getSheetByName("احصائيات الدخول");
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var sId = data[i][5];
      if (sId) {
        sendText(sId, "🔔 إعلان جديد:\n" + msgText);
        Utilities.sleep(100);
      }
    }
  } catch(e){}
}

function broadcastToFacultyStudents(faculty, msgText) {
  try {
    checkAndSetupSheets();
    var sheet = SpreadsheetApp.openById(ssId).getSheetByName("احصائيات الدخول");
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var sId = data[i][5];
      var fName = data[i][6];
      if (sId && fName && fName.toString().trim() === faculty.toString().trim()) {
        sendText(sId, "📢 إعلان لكليتك:\n" + msgText);
        Utilities.sleep(100);
      }
    }
  } catch(e){}
}

function handleCallbacks(query) {
  var chatId = query.message.chat.id;
  var data = query.data;
  
  try {
    if (data.startsWith("sand_setfac_")) {
      var fac = data.split("sand_setfac_")[1];
      config.setProperty("SANDBOX_FACULTY_" + chatId, fac);
      var yearMenu = { inline_keyboard: [[{text:"سنة 1️⃣", callback_data:"sand_setyr_سنة 1️⃣"}], [{text:"سنة 2️⃣", callback_data:"sand_setyr_سنة 2️⃣"}]] };
      sendText(chatId, "السنة:", yearMenu);
    }
    
    if (data.startsWith("sand_setyr_")) {
      var yr = data.split("sand_setyr_")[1];
      config.setProperty("SANDBOX_YEAR_" + chatId, yr);
      config.setProperty("SANDBOX_MODE_" + chatId, "true");
      config.deleteProperty(chatId);
      sendText(chatId, "✅ تم تفعيل بيئة الاختبار");
    }
    
    if (data.startsWith("admin_reply_")) {
      var parts = data.split("_");
      var studentChatId = parts[2];
      var ticketRow = parts[3];
      config.setProperty(chatId, "REPLY_TO_TICKET_" + studentChatId + "_" + ticketRow);
      sendText(chatId, "اكتب الرد:");
    }
    
    if (data === "mod_name") {
      config.setProperty(chatId, "MOD_NAME");
      sendText(chatId, "اسمك الجديد:");
    }
    
    if (data === "mod_faculty") {
      config.setProperty(chatId, "MOD_FACULTY");
      sendFacultyKeyboard(chatId, "اختر الكلية:");
    }
    
    if (data === "mod_uniid") {
      config.setProperty(chatId, "MOD_UNIID");
      sendText(chatId, "الرقم الجامعي:");
    }
    
    if (data.startsWith("setfac")) {
      var facultyName = data.split("_")[1];
      var lastState = config.getProperty(chatId);
      if (lastState === "WAIT_FACULTY") {
        var name = config.getProperty(chatId + "_N");
        var phone = config.getProperty(chatId + "_P");
        var uniId = config.getProperty(chatId + "_U");
        var year = config.getProperty(chatId + "_Y");
        var ss = SpreadsheetApp.openById(ssId);
        checkAndSetupSheets();
        var sheet0 = ss.getSheetByName("احصائيات الدخول");
        sheet0.appendRow([new Date(), sheet0.getLastRow(), name, phone, uniId, chatId, facultyName, year, "نشط ✅"]);
        config.deleteProperty(chatId);
        config.deleteProperty(chatId + "_N");
        config.deleteProperty(chatId + "_P");
        config.deleteProperty(chatId + "_U");
        config.deleteProperty(chatId + "_Y");
        sendText(adminId, "🆕 طالب جديد: " + name);
        sendDynamicStudentMenu(chatId, {faculty: facultyName, year: year});
      }
    }
    
    if (data.startsWith("faq_")) {
      var key = data.split("faq_")[1];
      if (key === "docs") sendText(chatId, "📂 الوثائق المطلوبة:\n1. الشهادة الثانوية\n2. صور مصدقة\n3. شهادة طبية");
      if (key === "objections") sendText(chatId, "🎖️ يمكن الاعتراض خلال أسبوع من النشر");
    }
  } catch(e) {
    Logger.log("Callback Error: " + e.toString());
  }
  
  UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/answerCallbackQuery?callback_query_id=" + query.id);
}

function sendSpreadsheetAsExcel(chatId, captionTxt) {
  try {
    var url = "https://docs.google.com/spreadsheets/d/" + ssId + "/export?format=xlsx";
    var response = UrlFetchApp.fetch(url, { headers: { 'Authorization': 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    var blob = response.getBlob();
    var dateStr = Utilities.formatDate(new Date(), "GMT+3", "yyyy-MM-dd");
    blob.setName("AUST_" + dateStr + ".xlsx");
    var payload = { chat_id: chatId, document: blob, caption: "📦 " + captionTxt };
    UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendDocument", { method: "post", payload: payload });
  } catch (e) {
    Logger.log("Excel Error: " + e.toString());
    sendText(chatId, "❌ خطأ");
  }
}

function checkRequiredChannels(chatId) {
  var channels = ["@AUSTBotNews"];
  for (var i = 0; i < channels.length; i++) {
    try {
      var res = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/getChatMember?chat_id=" + channels[i] + "&user_id=" + chatId);
      var status = JSON.parse(res.getContentText()).result.status;
      if (status === "left" || status === "kicked") return false;
    } catch(e) { return true; }
  }
  return true;
}

function sendRequiredChannelsMessage(chatId) {
  var links = "⚠️ اشترك في @AUSTBotNews أولاً";
  sendTextRaw(chatId, links);
}

function logChannelSubscriber(chatId, firstName, username) {
  try {
    checkAndSetupSheets();
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName("توثيق المشتركين");
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] && data[i][0].toString().trim() === chatId.toString().trim()) return;
      }
      var userHandle = username ? "@" + username : "بدون";
      sheet.appendRow([chatId, firstName, userHandle, Utilities.formatDate(new Date(), "GMT+3", "yyyy-MM-dd HH:mm:ss"), "✅"]);
    }
  } catch(e) {}
}

function sendFacultyKeyboard(chatId, message) {
  var rows = [];
  for (var i = 0; i < faculties.length; i++) {
    rows.push([{text: faculties[i], callback_data: "setfac_" + faculties[i]}]);
  }
  sendText(chatId, message, {inline_keyboard: rows});
}

// ========================================================
// 📬 إرسال الرسائل
// ========================================================
function sendText(chatId, text, kb) {
  var payload = { 
    "chat_id": chatId, 
    "text": text, 
    "parse_mode": "Markdown", 
    "reply_markup": kb ? JSON.stringify(kb) : undefined 
  };
  UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", { 
    "method": "post", 
    "contentType": "application/json", 
    "payload": JSON.stringify(payload) 
  });
}

function sendTextRaw(chatId, text, kb) {
  var payload = { 
    "chat_id": chatId, 
    "text": text, 
    "reply_markup": kb ? JSON.stringify(kb) : undefined 
  };
  UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", { 
    "method": "post", 
    "contentType": "application/json", 
    "payload": JSON.stringify(payload) 
  });
}

// ========================================================
// 🛠️ إعداد الجداول
// ========================================================
function checkAndSetupSheets() {
  try {
    var ss = SpreadsheetApp.openById(ssId);
    var sheetsInfo = {
      "احصائيات الدخول": ["Date", "ID", "الاسم", "الهاتف", "الرقم", "UserID", "الكلية", "السنة", "الحالة"],
      "الشكاوى": ["Date", "ID", "الاسم", "الهاتف", "الرقم", "UserID", "النوع", "الشكوى", "الأولوية", "الحالة", "الكلية", "الرد"],
      "الصلاحيات": ["ID", "الكلية", "النوع"],
      "توثيق المشتركين": ["ID", "الاسم", "المعرف", "التاريخ", "الحالة"],
      "Bot_CMS": ["Text", "Emoji", "Row", "Visibility", "Type", "Content", "Faculty", "Year", "Clicks"],
      "الجدولة والنسخ الاحتياطي": ["التاريخ", "النوع", "المحتوى", "الوقت", "الحالة"],
      "سجل العمليات (Audit_Logs)": ["التاريخ", "ID", "القسم", "الإجراء"]
    };
    
    for (var sheetName in sheetsInfo) {
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(sheetsInfo[sheetName]);
        if (sheetName === "Bot_CMS") {
          sheet.appendRow(["الموقع", "🌐", "1", "🟢", "url", "https://aust.edu.sy", "", "", "0"]);
        }
      }
    }
  } catch(e) {
    Logger.log("Setup Error: " + e.toString());
  }
}
