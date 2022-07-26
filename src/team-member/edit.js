import { useEffect, useState, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { select, useSelect } from '@wordpress/data';
import { usePrevious } from '@wordpress/compose';
import {
	useBlockProps,
	RichText,
	MediaPlaceholder,
	BlockControls,
	MediaReplaceFlow,
	InspectorControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { isBlobURL, revokeBlobURL } from '@wordpress/blob';
import {
	Spinner,
	withNotices,
	ToolbarButton,
	PanelBody,
	TextareaControl,
	SelectControl,
	Icon,
	Tooltip,
	TextControl,
	button,
	Button,
} from '@wordpress/components';
// Draggable
import {
	DndContext,
	useSensor,
	useSensors,
	PointerSensor,
} from '@dnd-kit/core';
import {
	SortableContext,
	horizontalListSortingStrategy,
	arrayMove,
} from '@dnd-kit/sortable';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import SortableItem from './sortable-item';

function Edit( {
	attributes,
	setAttributes,
	noticeOperations,
	noticeUI,
	isSelected,
} ) {
	const { name, bio, url, alt, id, socialLinks } = attributes;
	const [ blobURL, setBlobURL ] = useState();
	const [ selectedLink, setSelectedLink ] = useState();

	const prevIsSelected = usePrevious( isSelected );
	const prevURL = usePrevious( url );
	const titleRef = useRef();

	//draggable sensors
	const sensors = useSensors(
		useSensor( PointerSensor, {
			activationConstraint: { distance: 5 },
		} )
	);

	const imageObject = useSelect(
		( select ) => {
			const { getMedia } = select( 'core' );
			return id ? getMedia( id ) : null;
		},
		[ id ]
	);

	// imageSizes of the theme
	const imageSizes = useSelect( ( select ) => {
		return select( blockEditorStore ).getSettings().imageSizes;
	}, [] );

	// image size options to select from
	const getImageSizeOptions = () => {
		if ( ! imageObject ) return [];
		const options = [];
		const sizes = imageObject.media_details.sizes;
		for ( const key in sizes ) {
			const size = sizes[ key ];
			const imageSize = imageSizes.find( ( s ) => s.slug === key );
			if ( imageSize ) {
				options.push( {
					label: imageSize.name,
					value: size.source_url,
				} );
			}
		}
		return options;
	};

	const onChangeName = ( newName ) => {
		setAttributes( { name: newName } );
	};
	const onChangeBio = ( newBio ) => {
		setAttributes( { bio: newBio } );
	};
	const changeAlt = ( newAlt ) => {
		setAttributes( { alt: newAlt } );
	};
	const onSelectImage = ( image ) => {
		if ( ! image || ! image.url ) {
			setAttributes( { url: undefined, id: undefined, alt: '' } );
			return;
		}
		setAttributes( { url: image.url, id: image.id, alt: image.alt } );
	};
	const onSelectURL = ( newURL ) => {
		setAttributes( { url: newURL, id: undefined, alt: '' } );
	};
	const onUploadError = ( mesg ) => {
		noticeOperations.removeAllNotices();
		noticeOperations.createErrorNotice( mesg );
	};
	const removeImage = () => {
		setAttributes( {
			url: undefined,
			alt: '',
			id: undefined,
		} );
	};
	const addNewSocialItem = () => {
		setAttributes( {
			socialLinks: [ ...socialLinks, { icon: 'wordpress', link: '' } ],
		} );
		setSelectedLink( socialLinks.length );
	};
	const onChangeImageSize = ( newURL ) => {
		setAttributes( { url: newURL } );
	};
	const updateSocialItem = ( type, value ) => {
		const socialLinksCopy = [ ...socialLinks ];
		socialLinksCopy[ selectedLink ][ type ] = value;
		setAttributes( { socialLinks: socialLinksCopy } );
	};
	const removeSocialItem = () => {
		setAttributes( {
			socialLinks: [
				...socialLinks.slice( 0, selectedLink ),
				...socialLinks.slice( selectedLink + 1 ),
			],
		} );
		setSelectedLink();
	};

	const handleDragEnd = ( event ) => {
		const { active, over } = event;
		if ( active && over && active.id != over.id ) {
			const oldIndex = socialLinks.findIndex(
				( i ) => active.id === `${ i.icon }-${ i.link }`
			);
			const newIndex = socialLinks.findIndex(
				( i ) => over.id === `${ i.icon }-${ i.link }`
			);
			setAttributes( {
				socialLinks: arrayMove( socialLinks, oldIndex, newIndex ),
			} );
			setSelectedLink( newIndex );
		}
	};

	// if user upload img then updates and refresh before uploaded done then will just show upload box again
	useEffect( () => {
		if ( ! id && isBlobURL( url ) ) {
			setAttributes( {
				url: undefined,
				alt: '',
			} );
		}
	}, [] );
	// Prevents memory leak of bloburls
	useEffect( () => {
		if ( isBlobURL( url ) ) {
			setBlobURL( url );
		} else {
			revokeBlobURL( blobURL );
			setBlobURL();
		}
	}, [ url ] );
	// Automatically move cursor to next element to type
	useEffect( () => {
		if ( url && ! prevURL && isSelected ) {
			titleRef.current.focus();
		}
	}, [ url, prevURL ] );
	// deselects the Social link if its selected but you are on another block
	useEffect( () => {
		if ( prevIsSelected && ! isSelected ) {
			setSelectedLink();
		}
	}, [ isSelected, prevIsSelected ] );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ 'Image Settings' }>
					{ id && (
						<SelectControl
							label={ __( 'Image Size', 'team-members' ) }
							options={ getImageSizeOptions() }
							value={ url }
							onChange={ onChangeImageSize }
						/>
					) }
					{ url && ! isBlobURL( url ) && (
						<TextareaControl
							label={ 'Alt Text' }
							value={ alt }
							onChange={ changeAlt }
							help={
								"Alternative text describes your image to people who can't see it. Add a short description with its key details"
							}
						/>
					) }
				</PanelBody>
			</InspectorControls>
			{ url && (
				<BlockControls group="inline">
					<MediaReplaceFlow
						name={ 'Replace Image' }
						onSelect={ onSelectImage }
						onSelectURL={ onSelectURL }
						onError={ onUploadError }
						accept="image/*"
						allowedTypes={ [ 'image' ] }
						mediaId={ id }
						mediaURL={ url }
					/>
					<ToolbarButton onClick={ removeImage }>
						{ 'Remove Image' }
					</ToolbarButton>
				</BlockControls>
			) }
			<div { ...useBlockProps() }>
				{ url && (
					<div
						className={ `wp-block-blocks-course-team-img${
							isBlobURL( url ) ? ' is-loading' : ''
						}` }
					>
						<img src={ url } alt={ alt } />
						{ isBlobURL( url ) && <Spinner /> }
					</div>
				) }
				<MediaPlaceholder
					icon="admin-users"
					onSelect={ onSelectImage }
					onSelectURL={ onSelectURL }
					onError={ onUploadError }
					accept="image/*"
					allowedTypes={ [ 'image' ] }
					disableMediaButtons={ url }
					notices={ noticeUI }
				/>
				<RichText
					ref={ titleRef }
					placeholder={ __( 'Member Name', 'team-member' ) }
					tagName="h4"
					value={ name }
					onChange={ onChangeName }
					allowedFormats={ [] }
				/>
				<RichText
					placeholder={ __( 'Member Bio', 'team-member' ) }
					tagName="p"
					value={ bio }
					onChange={ onChangeBio }
					allowedFormats={ [] }
				/>
				<div className="wp-block-blocks-course-team-social-links">
					<ul>
						<DndContext
							sensors={ sensors }
							onDragEnd={ handleDragEnd }
							modifiers={ [ restrictToHorizontalAxis ] }
						>
							<SortableContext
								items={ socialLinks.map(
									( item ) => `${ item.icon }-${ item.link }`
								) }
								strategy={ horizontalListSortingStrategy }
							>
								{ socialLinks.map( ( item, index ) => {
									return (
										<SortableItem
											key={ `${ item.icon }-${ item.link }` }
											id={ `${ item.icon }-${ item.link }` }
											index={ index }
											selectedLink={ selectedLink }
											setSelectedLink={ setSelectedLink }
											icon={ item.icon }
										/>
									);
								} ) }
							</SortableContext>
						</DndContext>

						{ isSelected && (
							<li className="wp-block-blocks-course-team-add-icon-li">
								<Tooltip text={ 'Add Social Link' }>
									<button
										aria-label={ 'Add Social Link' }
										onClick={ addNewSocialItem }
									>
										<Icon icon="plus" />
									</button>
								</Tooltip>
							</li>
						) }
					</ul>
				</div>
				{ selectedLink !== undefined && (
					<div className="wp-block-blocks-course-team-member-social-link-form">
						<TextControl
							label={ 'Dashicon Icon' }
							value={ socialLinks[ selectedLink ].icon }
							onChange={ ( icon ) =>
								updateSocialItem( 'icon', icon )
							}
						/>
						<TextControl
							label={ 'URL' }
							value={ socialLinks[ selectedLink ].link }
							onChange={ ( link ) =>
								updateSocialItem( 'link', link )
							}
						/>
						<br />
						<Button isDestructive onClick={ removeSocialItem }>
							{ 'Remove link' }
						</Button>
					</div>
				) }
			</div>
		</>
	);
}
export default withNotices( Edit );
