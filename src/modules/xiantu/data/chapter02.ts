import type { XianTuChapter } from '../types';
import heroXiantuCh2Scroll from '../../../assets/images/hero_xiantu_ch2_scroll_1795135967311.jpg';
import artifactStringTalisman from '../../../assets/images/artifact_string_talisman_1795135971940.jpg';
import artifactStringViewLens from '../../../assets/images/artifact_string_view_lens_1795135968231.jpg';
import artifactCharconvFurnace from '../../../assets/images/artifact_charconv_furnace_1795135965927.jpg';
import artifactPrintlnSeal from '../../../assets/images/artifact_println_seal_1795135968926.jpg';

export const CHAPTER_02: XianTuChapter = {
  id: 'chapter-02',
  chapterNumber: 2,
  shortName: '神瞳观字符 · 格式化',
  title: '第二章 · 神瞳观字符，格式化通天',
  stageLabel: '主线 · 炼气期（第 2/3 章）',
  realmStage: '炼气小成 → 炼气后期',
  prologue:
    '韩小码初具现代 C++ 吐纳之法，自信满满地接下宗门“灵符文书处理”差事。可字符之海暗流汹涌，稍不留神便是差一字节溢出或悬垂视图反噬，他必须在这一章炼就破妄神瞳与格式化法印。',
  heroImageUrl: heroXiantuCh2Scroll,
  heroImageAlt: '古典水墨江峡与悬浮丝帛符卷、青玉晶镜的修仙画卷',
  heroCaption: '图 2 · 炼气中期 · 字符灵符与零拷贝神瞳意象',
  heroVerse: '「一针一尺观万象，自带玉盘刻符箓。」',
  heroTagline: '第 2/3 章 · 御字符：std::string、string_view、<charconv> 与范围格式化',
  artifacts: [
    {
      id: 'std-string',
      name: '原生灵符',
      syntax: 'std::string',
      identity: '自带自动扩缩灵脉的一等公民字符串法宝',
      superpower: '自动管理堆内存，支持 + 拼接、== 比较与 contains() 等安全查询',
      weakness: '高频只读传参或接收字面量时，构造与拷贝开销显著',
      imageUrl: artifactStringTalisman,
      imageAlt: '青玉轴头束紧的素青丝帛符卷，象征自动管理内存的 std::string',
      legacyCode: `char* buf { new char[strlen(src) + 1] };\nstrcpy(buf, src);\nif (strcmp(buf, "hello") == 0) { /* ... */ }\ndelete[] buf; // 易漏释、易差一字节越界`,
      modernCode: `using namespace std::string_literals;\nstd::string text { "hello C++23"s };\nif (text.contains("C++23") && text.starts_with("hello")) {\n    std::println("{}", text + "!");\n}`,
      comparisonNote:
        'std::string 彻底取代手写字符缓冲与 <cstring>；C++23 支持 contains() 并禁用 nullptr 构造。',
    },
    {
      id: 'std-string-view',
      name: '破妄神瞳',
      syntax: 'std::string_view',
      identity: 'C++17 只读字符串观察法宝',
      superpower: '仅携一枚指针与长度，零拷贝透视任意 C 字符串、字面量或 std::string',
      weakness: '不拥有内存所有权，若绑定临时字符串，原物消散后即化作悬垂魔眼',
      imageUrl: artifactStringViewLens,
      imageAlt: '青铜细框镶嵌的通透天然水晶观察镜，象征零拷贝的 std::string_view',
      legacyCode: `void logTitle(const std::string& title);\n// 传入字面量时被迫堆分配临时 std::string！\nlogTitle("Chapter 2: Strings");`,
      modernCode: `void logTitle(std::string_view title) {\n    // 按值传递（仅两个机器字），零堆分配、零拷贝\n    std::println("{}", title);\n}\nlogTitle("Chapter 2: Strings");`,
      comparisonNote:
        'string_view 仅作函数只读形参（短期借阅）；类成员变量与函数返回值一律使用拥有所有权的 std::string。',
    },
    {
      id: 'std-charconv',
      name: '无痛炼丹炉',
      syntax: 'std::to_chars / std::from_chars',
      identity: 'C++17/23 零分配底层数值转换法器',
      superpower: '直接在调用者缓冲区内完成无本地化依赖、零堆分配的高速转换，支持浮点完美往返',
      weakness: '不自动跳过前导空格，且须自行备足缓冲区并检查错误码 ec',
      imageUrl: artifactCharconvFurnace,
      imageAlt: '精铸宋式青铜三足炼丹炉，象征零分配高速转换的 charconv',
      legacyCode: `std::string s { std::to_string(3.1415926) }; // 堆分配 + locale 锁\ndouble val { std::stod(s) };`,
      modernCode: `std::array<char, 32> buf {};\nauto [ptr, ec] = std::to_chars(buf.data(), buf.data() + buf.size(), 3.1415926);\nif (ec == std::errc{}) {\n    std::println("零分配结果: {}", std::string_view{ buf.data(), ptr });\n}`,
      comparisonNote:
        '专为 JSON/XML 等高频协议序列化而生，零堆分配、无 locale 依赖且保障浮点数完美往返（Perfect Round-tripping）。',
    },
    {
      id: 'std-println',
      name: '天机排版印',
      syntax: 'std::print / std::println',
      identity: 'C++23 类型安全格式化输出法印',
      superpower: '编译期验证格式字符串，支持参数索引重排与容器范围（Ranges）直接打印',
      weakness: '格式串必须是编译期常量（动态多语言模板需改用 std::vprint_unicode）',
      imageUrl: artifactPrintlnSeal,
      imageAlt: '精雕青玉活字印章与白瓷朱砂印泥碟，象征 C++23 类型安全排版输出',
      legacyCode: `std::cout << "读取 " << n << " 字节自 " << src << "\\n";\nfor (int x : nums) std::cout << x << ", ";`,
      modernCode: `std::vector nums { 11, 22, 33 };\nstd::println("从 {1} 中读取 {0} 个字节", 128, "灵脉");\nstd::println("{:n}", nums);      // 11, 22, 33\nstd::println("{::*^6}", nums);   // [**11**, **22**, **33**]`,
      comparisonNote:
        'C++23 编译期校验占位符并原生支持容器范围打印；动态多语言格式模板须改用 std::vprint_unicode。',
    },
  ],
  rounds: [
    {
      id: 'ch2-r1',
      index: 1,
      total: 3,
      title: '第 1 回 · 结尾莫遗空，后缀定真身',
      shortTitle: '结尾莫遗空，后缀定真身',
      realm: '炼气小成 → 炼气中期',
      peril:
        '韩小码处理遗留 C 接口时写下 new char[strlen(str)]，因漏算结尾 \\0 字节瞬间触发缓冲区溢出；转投 std::vector 后，他又写下 vector names { "John", "Sam" };，结果类模板参数推导（CTAD）推演出的竟是 vector<const char*> 而非 vector<string>。',
      question:
        '师兄：为何 strlen() 总比实际所需内存少一字节？而双引号括起的字面量，又该如何让 auto 或 CTAD 认作真正的 std::string？',
      guidance: [
        'strlen() 统计的只是有效字符数，不含作为生死界碑的空字符 \\0（NUL），分配 C 字符串缓冲必须牢记 strlen(str) + 1；而 sizeof 作用于指针时测出的仅仅是指针本身大小（4 或 8 字节），绝不可用来测字符串长度。',
        '源码中裸露的双引号字面量，真身乃是只读内存区里的 const char[N]（衰变为 const char*）。引入 std::string_literals 后，在字面量末尾缀上 s（如 "John"s），方能直接铸造纯正的 std::string 对象；若写多行含引号文本，则可用原始字符串字面量 R"(...)" 免去转义之苦。',
      ],
      enlightenment: {
        mainline: '彻底摆脱易溢出的 <cstring> 陷阱，掌握 std::string 与字面量后缀 s。',
        breakthrough: '晋升【炼气中期】，识破字符数组与只读字面量的底层真身。',
        verse: '莫忘结尾空字符，后缀加 s 化真身。',
      },
      simulatorType: 'ch2-r1-cstring-ctad',
      simulatorTitle: '结尾符 \\0 & CTAD 后缀双法阵',
      simulatorSubtitle: '检查逐字节 \\0 溢出布局与双引号字面量在 CTAD 中的真实推导类型',
    },
    {
      id: 'ch2-r2',
      index: 2,
      total: 3,
      title: '第 2 回 · 神瞳零拷贝，无配转乾坤',
      shortTitle: '神瞳零拷贝，无配转乾坤',
      realm: '炼气中期',
      peril:
        '韩小码把所有只读字符串形参都写成 const string&，结果每次传入字面量都在后台触发堆内存分配生成临时 std::string；随后他在高频报文解析中调用 to_string() 与 stod()，频繁的堆分配与本地化锁争用再次拖垮了灵力运转。',
      question:
        '师兄：如何做到接收任意只读字符串（string、字面量、const char*）皆零拷贝？在高频协议序列化场景下，又该用何法器替代 to_string 与 stoi？',
      guidance: [
        '只读字符串参数一律首选 std::string_view，且应按值传递！它仅含一枚指针与长度，不分配任何堆内存即可统一透视所有字符串形态；若需独立副本，再显式调用 string { sv }。',
        '至于高频数值转换，当祭出 <charconv> 中的底层法器 std::to_chars() 与 std::from_chars()。它们直接在调用者预分配的缓冲区内刻画符文，零堆分配、无视本地化设置（locale-independent），且保证浮点数序列化与反序列化的“完美往返（Perfect Round-tripping）”。调用时只需通过结构化绑定 [ptr, ec] 校验错误码 ec == errc{} 即可。',
      ],
      enlightenment: {
        mainline: '以 std::string_view 与 <charconv> 构建零拷贝、零分配的高性能文本处理管线。',
        breakthrough: '稳固【炼气中期】，炼成零拷贝传参与底层转换神通。',
        verse: '一针一尺观万象，自带玉盘刻符箓。',
      },
      simulatorType: 'ch2-r2-sv-charconv',
      simulatorTitle: '零拷贝神瞳 & <charconv> 玉盘双法阵',
      simulatorSubtitle: '实测 string_view 零分配优势与 to_chars/from_chars 缓冲错误码',
    },
    {
      id: 'ch2-r3',
      index: 3,
      total: 3,
      title: '第 3 回 · 范围一印收，莫窥朝露影（章末大劫）',
      shortTitle: '范围一印收，莫窥朝露影',
      realm: '炼气中期 → 炼气后期',
      isBossTrial: true,
      peril:
        '韩小码先是顺手写下 string_view sv { s + " World!" };，并把 string_view 存作类的成员变量，结果临时字符串当场销毁，导致程序访问悬垂指针吐血崩溃；惊魂未定之际，他又把运行期拼接的 string fmt 传给 println(fmt, ...)，再次遭到编译器无情拦截。',
      question:
        '师兄：为何 string_view 绝不可绑定临时表达式或存为类成员？而 C++23 的 std::println() 在格式化容器范围与处理动态格式串时又有何铁律？',
      guidance: [
        '心魔就在此处——s + " World!" 产生的临时 std::string 在语句结束分号处即刻灰飞烟灭，sv 记下的指针瞬间沦为悬垂魔眼！护道铁律：string_view 仅作函数形参（短期借阅），类成员变量与函数返回值一律使用拥有所有权的 std::string。',
        '再看 C++23 std::println()，它原生支持直接打印 vector、pair 乃至嵌套容器（如 {:n} 去掉方括号、{::*^6} 定制元素格式），且能通过 {1}、{0} 索引重排适应多语言语序。但因其必须在编译期校验占位符类型，第一个参数必须是编译期常量；若需运行时动态加载多语言格式模板，必须改用 std::vprint_unicode(fmt, std::make_format_args(...))。',
      ],
      enlightenment: {
        mainline: '划清 std::string 所有权与 std::string_view 借阅边界，掌握 C++23 编译期格式化与范围输出。',
        breakthrough: '晋升【炼气后期】，彻底降服字符处理中的内存与生命周期心魔。',
        verse: '朝露临时莫驻眼，万千容器一印收。',
      },
      simulatorType: 'ch2-r3-println-dangling',
      simulatorTitle: '天机排版印 & 朝露悬垂双法阵',
      simulatorSubtitle: '实时体验 C++23 范围格式化输出，并单步追踪临时字符串导致的悬垂视图',
    },
  ],
};
