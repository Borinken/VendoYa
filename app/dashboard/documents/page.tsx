'use client'

import { useState, useEffect } from 'react'
import { FolderOpen, File, Search, Download, Eye, FolderPlus, Home as HomeIcon, ChevronRight, FileText, Image as ImageIcon, FileCode, Archive, Music, Video } from 'lucide-react'

interface FileItem {
  name: string
  type: 'file' | 'directory'
  handle: FileSystemFileHandle | FileSystemDirectoryHandle
  size?: number
  lastModified?: Date
}

interface SavedFolder {
  name: string
  path: string
  handle: FileSystemDirectoryHandle
}

export default function DocumentsPage() {
  const [currentFolder, setCurrentFolder] = useState<FileSystemDirectoryHandle | null>(null)
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [savedFolders, setSavedFolders] = useState<SavedFolder[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())

  // Cargar carpetas guardadas del localStorage
  useEffect(() => {
    const saved = localStorage.getItem('savedFolders')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSavedFolders(parsed)
      } catch (e) {
        console.error('Error loading saved folders:', e)
      }
    }
  }, [])

  // Verificar soporte de File System Access API
  const isSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window

  const getFileIcon = (name: string, type: string) => {
    if (type === 'directory') return <FolderOpen className="w-5 h-5 text-amber-500" />
    
    const ext = name.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
        return <FileText className="w-5 h-5 text-blue-500" />
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return <ImageIcon className="w-5 h-5 text-purple-500" />
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'json':
      case 'html':
      case 'css':
        return <FileCode className="w-5 h-5 text-emerald-500" />
      case 'zip':
      case 'rar':
      case '7z':
        return <Archive className="w-5 h-5 text-orange-500" />
      case 'mp3':
      case 'wav':
      case 'flac':
        return <Music className="w-5 h-5 text-pink-500" />
      case 'mp4':
      case 'avi':
      case 'mov':
        return <Video className="w-5 h-5 text-red-500" />
      default:
        return <File className="w-5 h-5 text-gray-500" />
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
  }

  const selectFolder = async () => {
    try {
      if (!isSupported) {
        alert('Tu navegador no soporta acceso directo a archivos. Usa Chrome, Edge o Safari actualizado.')
        return
      }

      // @ts-expect-error - File System Access API
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite'
      })
      
      setCurrentFolder(dirHandle)
      setBreadcrumbs([dirHandle.name])
      await loadFiles(dirHandle)

      // Guardar referencia
      const newFolder: SavedFolder = {
        name: dirHandle.name,
        path: dirHandle.name,
        handle: dirHandle
      }
      
      const updated = [...savedFolders.filter(f => f.name !== dirHandle.name), newFolder]
      setSavedFolders(updated)
      localStorage.setItem('savedFolders', JSON.stringify(updated.map(f => ({ name: f.name, path: f.path }))))
      
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error selecting folder:', error)
      }
    }
  }

  const loadFiles = async (dirHandle: FileSystemDirectoryHandle) => {
    setLoading(true)
    try {
      const items: FileItem[] = []
      
      // @ts-expect-error - File System Access API
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile()
          items.push({
            name: entry.name,
            type: 'file',
            handle: entry,
            size: file.size,
            lastModified: new Date(file.lastModified)
          })
        } else if (entry.kind === 'directory') {
          items.push({
            name: entry.name,
            type: 'directory',
            handle: entry
          })
        }
      }

      // Ordenar: carpetas primero, luego archivos alfabéticamente
      items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })

      setFiles(items)
    } catch (error) {
      console.error('Error loading files:', error)
    } finally {
      setLoading(false)
    }
  }

  const openFolder = async (dirHandle: FileSystemDirectoryHandle, folderName: string) => {
    setCurrentFolder(dirHandle)
    setBreadcrumbs([...breadcrumbs, folderName])
    await loadFiles(dirHandle)
  }

  const navigateToBreadcrumb = async () => {
    // Navegación hacia atrás no soportada fácilmente con File System Access API
    // Requeriría mantener un stack de handles
    alert('Por ahora, usa "Seleccionar Nueva Carpeta" para cambiar de ubicación')
  }

  const openFile = async (fileHandle: FileSystemFileHandle) => {
    try {
      const file = await fileHandle.getFile()
      const url = URL.createObjectURL(file)
      window.open(url, '_blank')
      
      // Liberar URL después de un tiempo
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (error) {
      console.error('Error opening file:', error)
      alert('No se pudo abrir el archivo')
    }
  }

  const downloadFile = async (fileHandle: FileSystemFileHandle) => {
    try {
      const file = await fileHandle.getFile()
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  const toggleFileSelection = (fileName: string) => {
    const newSelection = new Set(selectedFiles)
    if (newSelection.has(fileName)) {
      newSelection.delete(fileName)
    } else {
      newSelection.add(fileName)
    }
    setSelectedFiles(newSelection)
  }

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Documentos
            </h1>
            <p className="text-gray-600 text-lg">
              Accede a tus carpetas locales sin subir archivos al CRM
            </p>
          </div>
          <button
            onClick={selectFolder}
            className="flex items-center space-x-2 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all duration-300 font-medium shadow-md"
          >
            <FolderPlus className="w-5 h-5" />
            <span>Seleccionar Carpeta</span>
          </button>
        </div>

        {/* Breadcrumbs */}
        {currentFolder && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 bg-white px-4 py-3 rounded-lg border border-gray-200">
            <HomeIcon className="w-4 h-4" />
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center space-x-2">
                <ChevronRight className="w-4 h-4" />
                <button
                  onClick={() => navigateToBreadcrumb()}
                  className="hover:text-emerald-500 font-medium"
                >
                  {crumb}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {!isSupported ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Navegador no compatible</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Tu navegador no soporta acceso directo al sistema de archivos. 
            Por favor usa Chrome, Edge o Safari actualizado.
          </p>
        </div>
      ) : !currentFolder ? (
        <div className="grid gap-6">
          {/* Info Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">¿Cómo funciona?</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start space-x-2">
                    <span className="text-emerald-500 font-bold">1.</span>
                    <span>Haz clic en &quot;Seleccionar Carpeta&quot; para elegir una carpeta de tu computadora</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-emerald-500 font-bold">2.</span>
                    <span>Navega por los archivos y subcarpetas directamente desde el CRM</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-emerald-500 font-bold">3.</span>
                    <span>Busca documentos, ábrelos o descárgalos sin subirlos al servidor</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-emerald-500 font-bold">4.</span>
                    <span>Tus carpetas quedan vinculadas para acceso rápido en el futuro</span>
                  </li>
                </ul>
                <div className="mt-4 bg-white rounded-lg p-4 border border-emerald-200">
                  <p className="text-sm text-gray-600">
                    <strong className="text-emerald-600">🔒 Privacidad garantizada:</strong> Los archivos permanecen en tu computadora. 
                    El CRM solo tiene acceso temporal mientras esté abierta la carpeta.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Saved Folders */}
          {savedFolders.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Carpetas Recientes</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedFolders.map((folder) => (
                  <button
                    key={folder.name}
                    onClick={() => {
                      setCurrentFolder(folder.handle)
                      setBreadcrumbs([folder.name])
                      loadFiles(folder.handle)
                    }}
                    className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all text-left"
                  >
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{folder.name}</p>
                      <p className="text-xs text-gray-500 truncate">{folder.path}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Search & Actions Bar */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar archivos y carpetas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {filteredFiles.length} elementos
                </span>
                {selectedFiles.size > 0 && (
                  <span className="text-sm font-medium text-emerald-600">
                    ({selectedFiles.size} seleccionados)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Files List */}
          {loading ? (
            <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando archivos...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
              <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchQuery ? 'No se encontraron archivos con ese nombre' : 'Esta carpeta está vacía'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFiles(new Set(files.map(f => f.name)))
                            } else {
                              setSelectedFiles(new Set())
                            }
                          }}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tamaño
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Modificado
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredFiles.map((file, index) => (
                      <tr
                        key={index}
                        className={`hover:bg-gray-50 transition-colors ${
                          selectedFiles.has(file.name) ? 'bg-emerald-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={selectedFiles.has(file.name)}
                            onChange={() => toggleFileSelection(file.name)}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              if (file.type === 'directory') {
                                openFolder(file.handle as FileSystemDirectoryHandle, file.name)
                              } else {
                                openFile(file.handle as FileSystemFileHandle)
                              }
                            }}
                            className="flex items-center space-x-3 text-left hover:text-emerald-500 transition-colors"
                          >
                            {getFileIcon(file.name, file.type)}
                            <span className="font-medium text-gray-900">{file.name}</span>
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {file.type === 'directory' ? '-' : formatFileSize(file.size)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {file.lastModified ? file.lastModified.toLocaleDateString('es-ES') : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {file.type === 'file' && (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => openFile(file.handle as FileSystemFileHandle)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Abrir"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => downloadFile(file.handle as FileSystemFileHandle)}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Descargar"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
