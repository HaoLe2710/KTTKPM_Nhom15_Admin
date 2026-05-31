import React from 'react'

export default class AppErrorBoundary extends React.Component {
  constructor (props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError (error) {
    return { hasError: true, message: error?.message || '' }
  }

  componentDidCatch () {}

  render () {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-4xl mx-auto border border-red-300 bg-red-50 text-red-700 rounded-xl p-5">
          <div className="text-base font-semibold mb-1">Không thể hiển thị trang này</div>
          <div className="text-sm">Đã xảy ra lỗi giao diện ngoài dự kiến. Vui lòng tải lại trang hoặc thử lại sau.</div>
          {this.state.message && <div className="text-xs mt-2 opacity-80">Chi tiết: {this.state.message}</div>}
        </div>
      )
    }
    return this.props.children
  }
}
