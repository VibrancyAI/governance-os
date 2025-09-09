import Link from "next/link";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  const components = {
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <pre
          {...props}
          className={`${className} text-sm max-w-full overflow-x-auto bg-slate-900 text-slate-100 p-4 rounded-xl mt-3 mb-3 border border-slate-700 shadow-lg font-mono relative`}
        >
          <div className="absolute top-2 right-3 text-xs text-slate-400 uppercase tracking-wide font-medium">
            {match[1]}
          </div>
          <code className={match[1]} style={{ background: 'transparent' }}>{children}</code>
        </pre>
      ) : (
        <code
          className={`${className} text-sm bg-slate-100 text-slate-800 py-1 px-2 rounded-md border border-slate-200 font-mono`}
          {...props}
        >
          {children}
        </code>
      );
    },
    ol: ({ node, children, ...props }: any) => {
      return (
        <ol className="list-decimal list-outside ml-6 space-y-1.5 marker:text-blue-500 marker:font-medium my-3" {...props}>
          {children}
        </ol>
      );
    },
    li: ({ node, children, ...props }: any) => {
      return (
        <li className="pl-1 leading-relaxed" {...props}>
          {children}
        </li>
      );
    },
    ul: ({ node, children, ...props }: any) => {
      return (
        <ul className="list-disc list-outside ml-6 space-y-1.5 marker:text-blue-500 my-3" {...props}>
          {children}
        </ul>
      );
    },
    strong: ({ node, children, ...props }: any) => {
      return (
        <span className="font-semibold text-slate-900" {...props}>
          {children}
        </span>
      );
    },
    a: ({ node, children, ...props }: any) => {
      return (
        <Link
          className="text-blue-600 hover:text-blue-700 hover:underline transition-colors font-medium"
          target="_blank"
          rel="noreferrer"
          {...props}
        >
          {children}
        </Link>
      );
    },
    p: ({ node, children, ...props }: any) => {
      return (
        <p className="mb-3 leading-relaxed" {...props}>
          {children}
        </p>
      );
    },
    h1: ({ node, children, ...props }: any) => {
      return (
        <h1 className="text-xl font-bold text-slate-900 mb-4 mt-6 first:mt-0" {...props}>
          {children}
        </h1>
      );
    },
    h2: ({ node, children, ...props }: any) => {
      return (
        <h2 className="text-lg font-semibold text-slate-900 mb-3 mt-5 first:mt-0" {...props}>
          {children}
        </h2>
      );
    },
    h3: ({ node, children, ...props }: any) => {
      return (
        <h3 className="text-md font-semibold text-slate-900 mb-2 mt-4 first:mt-0" {...props}>
          {children}
        </h3>
      );
    },
    blockquote: ({ node, children, ...props }: any) => {
      return (
        <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50/50 rounded-r-lg" {...props}>
          {children}
        </blockquote>
      );
    },
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
};

export const Markdown = React.memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
