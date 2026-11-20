import { Fragment } from 'react';

/**
 * Splits Chinese technical prose so inline C++23 identifiers, declarations,
 * and syntax expressions render in optical-sized JetBrains Mono with crisp
 * baseline alignment against Noto Sans SC body text.
 */
const CPP_TOKEN_PATTERN =
  /(import\s+std;|import\s+<print>;|#include\s+<print>|#include|std::vprint_unicode\(fmt,\s*std::make_format_args\(\.\.\.\)\)|std::vprint_unicode|std::make_format_args|std::format_error|std::println\(\)|std::println|std::print|std::to_chars\(\)|std::from_chars\(\)|std::to_chars|std::from_chars|std::to_string\(\)|std::stod\(\)|std::string_view|std::string_literals|std::string|std::vector|std::optional|std::cout|using\s+namespace\s+std::string_literals;|new\s+char\[strlen\(str\)\]|char\*\s+result\s*\{\s*new\s+char\[strlen\(str\)\]\s*\};|strcpy\(result,\s*str\);|char\s+text\[\]\s*\{"abcdef"\}|const\s+char\*\s+text2|strlen\("hello"\)|strlen\(str\)\s*\+\s*1|strlen\(\)|vector<vector<int>>|vector<const\s+char\*>|vector<string>|vector\s+names\s*\{\s*"John",\s*"Sam",\s*"Joe"\s*\};?|vector\s+names\s*\{\s*"John",\s*"Sam"\s*\};?|string\s+s\s*\{\s*"Hello"\s*\};|string_view\s+sv\s*\{\s*s\s*\+\s*" World!"\s*\};?|println\(fmt,\s*\.\.\.\)|println\("\{\}",\s*sv\);|s\s*\+\s*" World!"|string\s*\{\s*sv\s*\}|string_view\s+sv|string\s+fmt|"John"s|"My view"sv|"\.\.\."s|"\.\.\."sv|R"\(\.\.\.\)"|\[first,\s*last\)|\[ptr,\s*ec\]|ec\s*==\s*errc\{\}|\{::\*\^6\}|\{:n\}|\{1\}|\{0\}|static_cast<int>\(3\.14\)|\.salary\s*=\s*80'000|int\s+firePower\s*=\s*3\.14;|int\s+x\s*\{\s*3\.14\s*\};|int\*\s+const\s+ip\s*\{\s*new\s+int\[10\]\s*\};|int\*\s+const\s+ip|int\s+const\*\s+ip|const\s+int\*\s+ip|const\s+int\*|int\s+const\*|int\*\s+const|ip\[4\]\s*=\s*5|getSalary\(\)\s*const|const\s+string&\s+foo\(\)|auto\s+f1\s*\{\s*foo\(\)\s*\};?|const\s+auto&\s+f2\s*\{\s*foo\(\)\s*\}|const\s+auto\s+p1\s*\{\s*&i\s*\};?|const\s+auto\*\s+p3\s*\{\s*&i\s*\}|const\s+auto&|const\s+auto\*|auto&|auto\*|const\s+std::string&|const\s+string&|const\s+T&|const&|const-correct|const\s+char\[N\]|const\s+char\*|char\*|enum\s+class|Employee&|Employee|delete\[\]|nullptr|constexpr|starts_with|contains\(\)|contains|\.size\(\)|to_chars|from_chars|to_string\(\)|to_string|stod\(\)|strcpy|strcat|sizeof|stoi|printf|println|string_view|foo\(\)|<cstring>|<charconv>|<numbers>|\\0|\/\/\s*如果\s*result\s*模\s*2\s*等于\s*0|result\s*%\s*2\s*==\s*0|bool\s+isEven\(int\)|int\s+__myVar;|class\s+_Controller;|val\s*=\s*val\+\+\s*\+\s*86400;|val\s*=\s*val\+\+|i\+\+\s*\+\s*\+\+i|const_cast\(\)|const_cast|_FormatUser|_Name|_name|__|m_|get\/set|if\/else|86400|3600|string|vector|optional|const|auto|enum|if|\{\})/g;

interface RichProseProps {
  text: string;
  className?: string;
}

export function RichProse({ text, className = '' }: RichProseProps) {
  const parts = text.split(CPP_TOKEN_PATTERN);

  return (
    <span className={className}>
      {parts.map((part, idx) => {
        if (!part) return null;
        if (idx % 2 === 1) {
          return (
            <code
              key={idx}
              className="font-code text-[0.87em] px-1.5 py-[1px] mx-[1px] rounded-[4px] bg-[#EBF0ED] dark:bg-[#1C2824] text-[#174A38] dark:text-[#86D5B8] border border-[#1E6B52]/12 dark:border-[#5AB897]/18 align-baseline"
            >
              {part}
            </code>
          );
        }
        return <Fragment key={idx}>{part}</Fragment>;
      })}
    </span>
  );
}
